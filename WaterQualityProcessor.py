import json
import boto3
import time
from datetime import datetime, timezone
from decimal import Decimal
from botocore.exceptions import ClientError

# --- Define Alert Thresholds, Types, and Severities ---
# These are illustrative. Adjust them to your system's specific needs.

# pH
PH_NORMAL_LOWER = Decimal("6.5")
PH_NORMAL_UPPER = Decimal("8.5")
PH_EXCELLENT_LOWER = Decimal("7.0")
PH_EXCELLENT_UPPER = Decimal("7.8")
PH_LOW_ALERT_SEVERITY = "MEDIUM"
PH_HIGH_ALERT_SEVERITY = "MEDIUM"

# Turbidity (NTU)
TURBIDITY_NORMAL_UPPER = Decimal("4.0") # Anything above this is an alert
TURBIDITY_EXCELLENT_UPPER = Decimal("1.0")
TURBIDITY_HIGH_ALERT_SEVERITY = "HIGH"

# Dissolved Oxygen (mg/L)
DO_NORMAL_LOWER = Decimal("6.0") # Anything below this is an alert
DO_EXCELLENT_LOWER = Decimal("7.5")
DO_LOW_ALERT_SEVERITY = "MEDIUM"

# Temperature (°C)
TEMP_NORMAL_LOWER = Decimal("20.0")
TEMP_NORMAL_UPPER = Decimal("30.0")
TEMP_EXCELLENT_LOWER = Decimal("22.0")
TEMP_EXCELLENT_UPPER = Decimal("26.0")
TEMP_LOW_ALERT_SEVERITY = "LOW"
TEMP_HIGH_ALERT_SEVERITY = "LOW"

# Conductivity (µS/cm)
COND_NORMAL_LOWER = Decimal("200.0")
COND_NORMAL_UPPER = Decimal("800.0")
COND_EXCELLENT_LOWER = Decimal("300.0")
COND_EXCELLENT_UPPER = Decimal("500.0")
COND_LOW_ALERT_SEVERITY = "LOW"
COND_HIGH_ALERT_SEVERITY = "LOW"

# TDS (Total Dissolved Solids - ppm)
TDS_NORMAL_LOWER = Decimal("100.0")
TDS_NORMAL_UPPER = Decimal("400.0")
TDS_EXCELLENT_LOWER = Decimal("150.0")
TDS_EXCELLENT_UPPER = Decimal("250.0")
TDS_LOW_ALERT_SEVERITY = "LOW"
TDS_HIGH_ALERT_SEVERITY = "LOW"

# ORP (Oxidation-Reduction Potential - mV)
ORP_NORMAL_LOWER = Decimal("250.0")
ORP_NORMAL_UPPER = Decimal("750.0") # Assuming an upper bound for normalcy for example
ORP_EXCELLENT_LOWER = Decimal("600.0")
ORP_EXCELLENT_UPPER = Decimal("700.0")
ORP_LOW_ALERT_SEVERITY = "MEDIUM"
ORP_HIGH_ALERT_SEVERITY = "LOW"


def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table_name = os.environ.get('DYNAMODB_TABLE_NAME')
    table = dynamodb.Table('table_name') # Using table name from your batch example

    # Using the provided current time for consistency in this example
    # In a real Lambda, you'd use datetime.now(timezone.utc)
    # current_timestamp_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    current_timestamp_iso = "2025-05-27T16:59:52Z" # From your provided current time

    try:
        required_keys = [
            'device_id', 'DormName', 'ORP', 'pH', 'temp',
            'conductivity', 'dissolved_oxygen', 'tds', 'turbidity'
        ]
        for key in required_keys:
            if key not in event:
                raise KeyError(f"Missing required key in event: {key}")

        device_id = event['device_id']
        dorm_name_from_event = event['DormName']

        orp_mv = Decimal(str(event['ORP']))
        ph_value = Decimal(str(event['pH']))
        temperature_celsius = Decimal(str(event['temp']))
        conductivity_us_cm = Decimal(str(event['conductivity']))
        dissolved_oxygen_mg_l = Decimal(str(event['dissolved_oxygen']))
        tds_ppm = Decimal(str(event['tds']))
        turbidity_ntu = Decimal(str(event['turbidity']))

        water_quality_map = {
            "conductivity_us_cm": conductivity_us_cm,
            "dissolved_oxygen_mg_l": dissolved_oxygen_mg_l,
            "orp_mv": orp_mv,
            "ph": ph_value,
            "tds_ppm": tds_ppm,
            "temperature_celsius": temperature_celsius,
            "turbidity_ntu": turbidity_ntu
        }

        # --- Comprehensive Alerting Logic ---
        alerts_list = []
        is_excellent_candidate = True # Flag to check for EXCELLENT status

        # pH Alerts
        if ph_value < PH_NORMAL_LOWER:
            alerts_list.append({
                "type": "PH_LOW", "severity": PH_LOW_ALERT_SEVERITY,
                "message": f"pH level {ph_value} is below safe limit of {PH_NORMAL_LOWER}"
            })
        elif ph_value > PH_NORMAL_UPPER:
            alerts_list.append({
                "type": "PH_HIGH", "severity": PH_HIGH_ALERT_SEVERITY,
                "message": f"pH level {ph_value} exceeds safe limit of {PH_NORMAL_UPPER}"
            })
        if not (PH_EXCELLENT_LOWER <= ph_value <= PH_EXCELLENT_UPPER):
            is_excellent_candidate = False

        # Turbidity Alert
        if turbidity_ntu > TURBIDITY_NORMAL_UPPER:
            alerts_list.append({
                "type": "TURBIDITY_HIGH", "severity": TURBIDITY_HIGH_ALERT_SEVERITY,
                "message": f"Turbidity level {turbidity_ntu} NTU exceeds safe limit of {TURBIDITY_NORMAL_UPPER} NTU"
            })
        if turbidity_ntu > TURBIDITY_EXCELLENT_UPPER:
            is_excellent_candidate = False
            
        # Dissolved Oxygen Alert
        if dissolved_oxygen_mg_l < DO_NORMAL_LOWER:
            alerts_list.append({
                "type": "DO_LOW", "severity": DO_LOW_ALERT_SEVERITY,
                "message": f"Dissolved oxygen {dissolved_oxygen_mg_l} mg/L is below recommended minimum of {DO_NORMAL_LOWER} mg/L"
            })
        if dissolved_oxygen_mg_l < DO_EXCELLENT_LOWER:
            is_excellent_candidate = False

        # Temperature Alerts
        if temperature_celsius < TEMP_NORMAL_LOWER:
            alerts_list.append({
                "type": "TEMP_LOW", "severity": TEMP_LOW_ALERT_SEVERITY,
                "message": f"Temperature {temperature_celsius}°C is below safe limit of {TEMP_NORMAL_LOWER}°C"
            })
        elif temperature_celsius > TEMP_NORMAL_UPPER:
            alerts_list.append({
                "type": "TEMP_HIGH", "severity": TEMP_HIGH_ALERT_SEVERITY,
                "message": f"Temperature {temperature_celsius}°C exceeds safe limit of {TEMP_NORMAL_UPPER}°C"
            })
        if not (TEMP_EXCELLENT_LOWER <= temperature_celsius <= TEMP_EXCELLENT_UPPER):
            is_excellent_candidate = False

        # Conductivity Alerts
        if conductivity_us_cm < COND_NORMAL_LOWER:
            alerts_list.append({
                "type": "COND_LOW", "severity": COND_LOW_ALERT_SEVERITY,
                "message": f"Conductivity {conductivity_us_cm} µS/cm is below safe limit of {COND_NORMAL_LOWER} µS/cm"
            })
        elif conductivity_us_cm > COND_NORMAL_UPPER:
            alerts_list.append({
                "type": "COND_HIGH", "severity": COND_HIGH_ALERT_SEVERITY,
                "message": f"Conductivity {conductivity_us_cm} µS/cm exceeds safe limit of {COND_NORMAL_UPPER} µS/cm"
            })
        if not (COND_EXCELLENT_LOWER <= conductivity_us_cm <= COND_EXCELLENT_UPPER):
            is_excellent_candidate = False

        # TDS Alerts
        if tds_ppm < TDS_NORMAL_LOWER:
            alerts_list.append({
                "type": "TDS_LOW", "severity": TDS_LOW_ALERT_SEVERITY,
                "message": f"TDS level {tds_ppm} ppm is below safe limit of {TDS_NORMAL_LOWER} ppm"
            })
        elif tds_ppm > TDS_NORMAL_UPPER:
            alerts_list.append({
                "type": "TDS_HIGH", "severity": TDS_HIGH_ALERT_SEVERITY,
                "message": f"TDS level {tds_ppm} ppm exceeds safe limit of {TDS_NORMAL_UPPER} ppm"
            })
        if not (TDS_EXCELLENT_LOWER <= tds_ppm <= TDS_EXCELLENT_UPPER):
            is_excellent_candidate = False

        # ORP Alerts
        if orp_mv < ORP_NORMAL_LOWER:
            alerts_list.append({
                "type": "ORP_LOW", "severity": ORP_LOW_ALERT_SEVERITY,
                "message": f"ORP level {orp_mv} mV is below safe limit of {ORP_NORMAL_LOWER} mV"
            })
        elif orp_mv > ORP_NORMAL_UPPER:
            alerts_list.append({
                "type": "ORP_HIGH", "severity": ORP_HIGH_ALERT_SEVERITY,
                "message": f"ORP level {orp_mv} mV exceeds safe limit of {ORP_NORMAL_UPPER} mV"
            })
        if not (ORP_EXCELLENT_LOWER <= orp_mv <= ORP_EXCELLENT_UPPER):
            is_excellent_candidate = False

        # --- Determine quality_status ---
        quality_status = "GOOD" # Default

        if alerts_list:
            severities = [alert['severity'] for alert in alerts_list]
            if "HIGH" in severities:
                quality_status = "CRITICAL"
            elif "MEDIUM" in severities:
                quality_status = "WARNING"
            elif "LOW" in severities: # Assuming LOW also maps to WARNING if no higher severities
                quality_status = "WARNING"
            # If only other custom severities, they might map to WARNING or other statuses
        elif is_excellent_candidate: # No alerts AND all parameters within "excellent" range
            quality_status = "EXCELLENT"
        # else it remains "GOOD" (no alerts, but not all params are "excellent")


        item_to_store = {
            'device_id': device_id,
            'timestamp': current_timestamp_iso,
            'alerts': alerts_list,
            'dorm_name': dorm_name_from_event,
            'quality_status': quality_status,
            'water_quality': water_quality_map
        }
        
        for attempt in range(3):
            try:
                table.put_item(Item=item_to_store)
                break 
            except ClientError as err:
                if attempt < 2:
                    time.sleep((attempt + 1)) 
                else:
                    print(f"Failed to store item after multiple retries. Item: {json.dumps(item_to_store, default=str)}")
                    print(f"Error: {err}")
                    raise
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Water quality data stored successfully', 'item_stored': item_to_store}, default=str)
        }

    except KeyError as e:
        error_message = f"Error: Missing key in event data - {str(e)}."
        print(error_message)
        return { 'statusCode': 400, 'body': json.dumps(error_message) }
    except (TypeError, ValueError) as e:
        error_message = f"Error: Invalid data format for a sensor value - {str(e)}."
        print(error_message)
        return { 'statusCode': 400, 'body': json.dumps(error_message) }
    except Exception as e:
        error_message = f"Error storing data: {str(e)}"
        print(error_message) # Log for CloudWatch
        return { 'statusCode': 500, 'body': json.dumps(error_message) }
