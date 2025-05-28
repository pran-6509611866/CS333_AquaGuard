import json
import boto3
import os
from datetime import datetime
from linebot import LineBotApi, WebhookHandler
from linebot.models import MessageEvent, TextMessage, TextSendMessage

# อ่าน LINE Token และ Secret จาก Environment Variable
LINE_CHANNEL_ACCESS_TOKEN = os.environ['LINE_CHANNEL_ACCESS_TOKEN']
LINE_CHANNEL_SECRET = os.environ['LINE_CHANNEL_SECRET']

line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

# สร้าง DynamoDB Resource และ Table
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('SensorDB')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        signature = event['headers']['x-line-signature']
        handler.handle(event['body'], signature)

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
    user_message = event.message.text.strip()

    if user_message == "รายงานคุณภาพนํ้าวันนี้":
        items = get_all_water_quality_items()
        reply_message = build_water_quality_report(items)
    else:
        reply_message = "กรุณาพิมพ์คำว่า 'รายงานคุณภาพนํ้าวันนี้' เพื่อดูสถานะคุณภาพน้ำรวม"

    line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text=reply_message)
    )

def get_all_water_quality_items():
    try:
        response = table.scan()
        return response.get('Items', [])
    except Exception as e:
        print(f"Error scanning table: {e}")
        return []

def build_water_quality_report(items):
    status_count = {
        "EXCELLENT": [],
        "GOOD": [],
        "WARNING": [],
        "CRITICAL": []
    }
    alerts_by_dorm = {}
    latest_timestamp = ""

    for item in items:
        dorm = item.get("dorm_name", "")
        device_id = item.get("device_id", "")
        status = item.get("quality_status", "")
        timestamp = item.get("timestamp", "")
        status_count.setdefault(status, []).append((dorm, device_id))

        if status in ["WARNING", "CRITICAL"]:
            alerts = item.get("alerts", [])
            alert_msgs = []
            for alert in alerts:
                message = alert.get("message", "")
                alert_msgs.append(message)
            alerts_by_dorm[dorm] = {
                "device_id": device_id,
                "status": status,
                "alerts": alert_msgs
            }

        if timestamp > latest_timestamp:
            latest_timestamp = timestamp

    try:
        dt = datetime.strptime(latest_timestamp, "%Y-%m-%dT%H:%M:%SZ")
        thai_year = dt.year + 543
        date_thai = dt.strftime(f"%-d %b {thai_year}").replace("May", "พ.ค.").replace("Jun", "มิ.ย.")
    except:
        date_thai = "ไม่ทราบ"

    summary_text = (
        f"🏠 **รายงานคุณภาพน้ำ AquaGuard** (อัปเดตล่าสุด: {date_thai})\n\n"
        f"**สรุปสถานะโดยรวม:**\n"
        f"• 🟢 ดีเยี่ยม: {len(status_count['EXCELLENT'])} จุด ({', '.join([d for d, _ in status_count['EXCELLENT']])})\n"
        f"• 🟡 ดี: {len(status_count['GOOD'])} จุด ({', '.join([d for d, _ in status_count['GOOD']])})\n"
        f"• 🟠 เตือน: {len(status_count['WARNING'])} จุด ({', '.join([d for d, _ in status_count['WARNING']])})\n"
        f"• 🔴 วิกฤต: {len(status_count['CRITICAL'])} จุด ({', '.join([d for d, _ in status_count['CRITICAL']])})\n"
    )

    attention_text = ""
    if alerts_by_dorm:
        attention_text += "\n**จุดที่ต้องให้ความสนใจ:**\n"
        for dorm, data in alerts_by_dorm.items():
            emoji = "⚠️"
            label = "สถานะวิกฤต" if data["status"] == "CRITICAL" else "เตือน"
            dorm_label = f"**หอพัก {dorm}**"
            if dorm == "C3" and data["device_id"].endswith("002"):
                dorm_label = f"**หอพัก {dorm} (เครื่อง 002)**"
            attention_text += f"{emoji} {dorm_label} - {label}\n"
            for msg in data["alerts"]:
                attention_text += f"- {msg}\n"

    closing_text = "\nจุดอื่นๆ ทั้งหมดอยู่ในเกณฑ์ปลอดภัย"
    return summary_text + attention_text + closing_text
