import json
import boto3
from linebot import LineBotApi, WebhookHandler
from linebot.models import MessageEvent, TextMessage, TextSendMessage
import os
from datetime import datetime, timedelta

# ใช้ Environment Variable สำหรับ LINE และ DynamoDB
LINE_CHANNEL_ACCESS_TOKEN = os.environ['LINE_CHANNEL_ACCESS_TOKEN']
LINE_CHANNEL_SECRET = os.environ['LINE_CHANNEL_SECRET']

line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

# สร้าง DynamoDB Client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('SensorDB')

def lambda_handler(event, context):
    try:
        body = event['body']
        headers = event['headers']
        signature = headers['x-line-signature']

        handler.handle(body, signature)

        return {
            'statusCode': 200,
            'body': json.dumps('Webhook handled successfully!')
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error handling Webhook event')
        }

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    user_message = event.message.text.strip()  # อ่านข้อความที่ผู้ใช้ส่งมา
    today = datetime.now().strftime('%Y-%m-%d')  # วันที่ปัจจุบัน

    # ตรวจสอบข้อความของผู้ใช้
    if user_message.endswith("-วันนี้"):  # เช่น "C7-วันนี้"
        dorm_name = user_message.split("-")[0]  # ดึงชื่อหอพัก
        date = today  # ใช้วันที่ปัจจุบัน
        response = get_water_quality(dorm_name, date)
        reply_message = format_reply(dorm_name, date, response)
    
    elif user_message.endswith("-ประวัติ"):  # เช่น "C7-ประวัติ"
        dorm_name = user_message.split("-")[0]  # ดึงชื่อหอพัก
        date = today  # ใช้วันที่ปัจจุบัน
        historical_data = get_historical_data(dorm_name, date)
        reply_message = format_historical_reply(dorm_name, historical_data)
    
    else:
        reply_message = "กรุณาพิมพ์หอพักตามรูปแบบ: <หอพัก>-วันนี้ หรือ <หอพัก>-ประวัติ"

    # ส่งข้อความตอบกลับ
    line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text=reply_message)
    )

# ฟังก์ชันดึงข้อมูลคุณภาพน้ำของหอพักในวันที่กำหนด
def get_water_quality(dorm_name, date):
    try:
        response = table.get_item(
            Key={
                'DormName': dorm_name,
                'Date': date
            }
        )
        if 'Item' in response:
            item = response['Item']
            # เพิ่มฟิลด์ "quality"
            item['quality'] = 'GOOD' if item['ORP'] >= 300 else 'POOR'  # ตรวจสอบ ORP ว่ามีค่ามากกว่า 300 หรือไม่
            return item
        else:
            return None
    except Exception as e:
        print(f"Error fetching water quality data: {e}")
        return None

# ฟังก์ชันดึงข้อมูลย้อนหลัง 7 วัน
def get_historical_data(dorm_name, current_date):
    historical_data = []
    for i in range(7):
        past_date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
        try:
            response = table.get_item(
                Key={
                    'DormName': dorm_name,
                    'Date': past_date
                }
            )
            if 'Item' in response:
                item = response['Item']
                # เพิ่มฟิลด์ "quality"
                item['quality'] = 'GOOD' if item['ORP'] >= 300 else 'POOR'  # ตรวจสอบ ORP ว่ามีค่ามากกว่า 300 หรือไม่
                historical_data.append(item)
        except Exception as e:
            print(f"Error fetching historical data for {past_date}: {e}")
    return historical_data

# ฟังก์ชันจัดรูปแบบข้อความสำหรับข้อมูลวันนี้
def format_reply(dorm_name, date, data):
    if data:
        return (
            f"คุณภาพน้ำของหอพัก {dorm_name} ในวันที่ {date}:\n"
            f"- ค่า ORP: {data['ORP']} mV\n"
            f"- ค่า pH: {data['pH']}\n"
            f"- อุณหภูมิ: {data['temperature']} °C\n"
            f"- คุณภาพน้ำ: {data['quality']}\n"
            f"- เวลาบันทึก: {data['timestamp']}"
        )
    else:
        return f"ไม่พบข้อมูลคุณภาพน้ำของหอพัก {dorm_name} สำหรับวันที่ {date}"

# ฟังก์ชันจัดรูปแบบข้อความสำหรับข้อมูลย้อนหลัง 7 วัน
def format_historical_reply(dorm_name, historical_data):
    if historical_data:
        reply_message = f"ข้อมูลคุณภาพน้ำของหอพัก {dorm_name} ใน 7 วันที่ผ่านมา:\n"
        for data in historical_data:
            reply_message += (
                f"วันที่ {data['Date']}:\n"
                f"- ค่า ORP: {data['ORP']} mV\n"
                f"- ค่า pH: {data['pH']}\n"
                f"- อุณหภูมิ: {data['temperature']} °C\n"
                f"- คุณภาพน้ำ: {data['quality']}\n"
                f"- เวลาบันทึก: {data['timestamp']}\n\n"
            )
        return reply_message
    else:
        return f"ไม่พบข้อมูลคุณภาพน้ำย้อนหลังสำหรับหอพัก {dorm_name} ใน 7 วันที่ผ่านมา"
