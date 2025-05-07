import json
import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.types import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('SensorDB')

def decimal_default(obj):
if isinstance(obj, Decimal):
return float(obj)
raise TypeError

def lambda_handler(event, context):
try:
# Get query string parameter
dorm = event.get('queryStringParameters', {}).get('DormName', None)

    if dorm:
        response = table.query(
            KeyConditionExpression=Key('DormName').eq(dorm)
        )
        items = response['Items']
    else:
        # fallback: scan entire table (not recommended for large datasets)
        response = table.scan()
        items = response['Items']

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(items, default=decimal_default)
    }

except Exception as e:
    print(f"Error: {str(e)}")
    return {
        "statusCode": 500,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"error": str(e)})
    }