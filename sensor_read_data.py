import json 
import boto3 
import os 
from decimal import Decimal 
 
# Custom JSON encoder to handle Decimal types from DynamoDB 
class DecimalEncoder(json.JSONEncoder): 
    def default(self, o): 
        if isinstance(o, Decimal): 
            # Convert Decimal to float or int. 
            # If it's a whole number, convert to int, otherwise float. 
            if o % 1 == 0: 
                return int(o) 
            else: 
                return float(o) 
        return super(DecimalEncoder, self).default(o) 
 
# Initialize DynamoDB client 
dynamodb = boto3.resource('dynamodb') 
table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'SensorDB') # Use environment variable or default 
table = dynamodb.Table(table_name) 
 
def lambda_handler(event, context): 
    """ 
    Retrieves all items from the DynamoDB table. 
    """ 
    try: 
        response = table.scan() 
        items = response.get('Items', []) 
 
        # Handle pagination if the table is large 
        while 'LastEvaluatedKey' in response: 
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey']) 
            items.extend(response.get('Items', [])) 
 
        return { 
            'statusCode': 200, 
            'headers': { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' # Add appropriate CORS headers if needed 
            }, 
            # Use the custom encoder 
            'body': json.dumps(items, cls=DecimalEncoder) 
        } 
    except Exception as e: 
        print(f"Error scanning DynamoDB table: {e}") 
        return { 
            'statusCode': 500, 
            'headers': { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }, 
            'body': json.dumps({'error': str(e)}) 
        } 
 
# Example usage (for local testing, not part of Lambda deployment) 
if __name__ == '__main__': 
    # Mock event and context for local testing 
    mock_event = {} 
    mock_context = {} 
    # Set environment variable for local testing if not set in your environment 
    # os.environ['DYNAMODB_TABLE_NAME'] = 'SensorDB' 
 
    # Example item with Decimal for local testing 
    mock_items_from_dynamodb = [ 
        { 
            "DormName": "c4", 
            "TimeStamp": "2025-05-01T14:00Z", 
            "orp": Decimal("320"), 
            "ph": Decimal("7.1"), 
            "temperature": Decimal("27.5") 
        } 
    ] 
 
    # Mock the table.scan() method for local testing 
    class MockTable: 
        def scan(self, ExclusiveStartKey=None): 
            if ExclusiveStartKey: 
                return {'Items': []} # Simulate no more items for pagination 
            return {'Items': mock_items_from_dynamodb} 
 
    original_table = table # Keep a reference to the original table 
    # table = MockTable() # Uncomment to use mock table for local testing 
 
    response = lambda_handler(mock_event, mock_context) 
    print(response) 
 
    # table = original_table # Restore original table if mocked