import json
import boto3
import os
from decimal import Decimal
import logging

# Setup logging for better debugging and monitoring in CloudWatch
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Custom JSON encoder to handle Decimal types from DynamoDB in the response
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            # Convert Decimal to int if it's a whole number, otherwise float
            if o % 1 == 0:
                return int(o)
            else:
                return float(o)
        return super(DecimalEncoder, self).default(o)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Best practice: Get table name from an environment variable.
# Ensure this environment variable is set in your Lambda configuration.
# Defaulting to 'AquaGuard-WaterQuality' based on previous context.
TABLE_NAME = os.environ.get('DYNAMODB_TABLE_NAME')
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    # Log the entire event for debugging (consider reducing verbosity in production if not needed)
    logger.info(f"Received event: {json.dumps(event)}")

    try:
        # Get query string parameters, default to empty dict if none
        query_params = event.get('queryStringParameters') if event.get('queryStringParameters') is not None else {}
        
        # --- Pagination Parameters ---
        try:
            # Default to 20 items per page, allow client to override.
            # DynamoDB's Scan/Query operations return up to 1MB of data per request, before applying filters.
            # A practical limit for 'Limit' parameter helps manage response size and client-side rendering.
            limit = int(query_params.get('limit', 20))
            if not (0 < limit <= 100): # Setting a practical upper bound (e.g., 100)
                logger.warning(f"Client requested limit '{query_params.get('limit')}' is out of bounds (1-100). Defaulting to 20.")
                limit = 20
        except ValueError:
            logger.warning(f"Invalid non-integer limit value '{query_params.get('limit')}' received. Defaulting to 20.")
            limit = 20

        exclusive_start_key_str = query_params.get('exclusiveStartKey')
        
        # --- DynamoDB Operation ---
        # The current implementation uses table.scan().
        # WARNING: For large tables, 'scan' operations can be SLOW and COSTLY as they read every item.
        # 'Scan' does not guarantee any order of items unless sorted client-side (inefficient for large datasets).
        # For optimal performance and cost, use 'query' operations with appropriate Global Secondary Indexes (GSIs)
        # when you need to filter by specific attributes (e.g., dorm_name, device_id) or require sorted results
        # (e.g., by timestamp). See notes below this function for guidance on using 'query'.

        scan_kwargs = {
            'Limit': limit
        }

        if exclusive_start_key_str:
            try:
                # ExclusiveStartKey from the client is a JSON stringified dictionary.
                # It must be parsed back into a Python dictionary.
                # Using parse_float=Decimal and parse_int=Decimal ensures that if any part of the key
                # was a number (and thus a Decimal in DynamoDB), its precision is maintained
                # when reconstructing the key for the next request. This is crucial for correctness.
                parsed_key = json.loads(exclusive_start_key_str, parse_float=Decimal, parse_int=Decimal)
                scan_kwargs['ExclusiveStartKey'] = parsed_key
                logger.info(f"Using ExclusiveStartKey for scan: {parsed_key}")
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON format for exclusiveStartKey: '{exclusive_start_key_str}'. Error: {e}")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*' # IMPORTANT: Restrict in production
                    },
                    'body': json.dumps({'error': 'Invalid exclusiveStartKey format. It must be a valid JSON string representing the key.'})
                }
            except Exception as e: 
                logger.error(f"Error processing exclusiveStartKey '{exclusive_start_key_str}': {str(e)}")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*' # IMPORTANT: Restrict in production
                    },
                    'body': json.dumps({'error': f'Could not process exclusiveStartKey: {str(e)}'})
                }
        
        logger.info(f"Performing table.scan() on '{TABLE_NAME}' with parameters: {scan_kwargs}")
        response = table.scan(**scan_kwargs)
        
        items = response.get('Items', [])
        # This is the key the client should send back as 'exclusiveStartKey' for the next page
        last_evaluated_key = response.get('LastEvaluatedKey')

        logger.info(f"Scan successful. Fetched {len(items)} items. LastEvaluatedKey present: {bool(last_evaluated_key)}")

        # Prepare the response for API Gateway
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                # IMPORTANT: For production, restrict Access-Control-Allow-Origin to your specific S3 website's domain.
                # Example: 'Access-Control-Allow-Origin': 'http://your-s3-website-bucket.s3-website-us-east-1.amazonaws.com'
                # Or your custom domain if you use one.
                'Access-Control-Allow-Origin': '*' 
            },
            'body': json.dumps({
                'items': items,
                'lastEvaluatedKey': last_evaluated_key 
            }, cls=DecimalEncoder) # Use the custom encoder for Decimals in 'items'
        }

    except Exception as e:
        # Catch-all for any other unhandled exceptions
        logger.error(f"Unhandled exception during Lambda execution: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' # IMPORTANT: Restrict in production
            },
            # Provide a generic error message to the client for security
            'body': json.dumps({'error': 'An internal server error occurred. Please try again later.'})
        }