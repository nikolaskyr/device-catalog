function Decode(fPort, bytes) {
    var bytesString = bytes2HexString(bytes).toLocaleUpperCase();
    var fport = parseInt(fPort);
    // var bytesString = input
    var decoded = {
        // valid
        valid: true,
        err: 0,
        // bytes
        payload: bytesString,
        // messages array
        messages: []
    };

    // CRC check
    if (!crc16Check(bytesString)) {
        decoded['valid'] = false;
        decoded['err'] = -1; // "crc check fail."
        return {
            data: decoded
        };
    }
	
	var measNum = bytes[1]
	var meas_list = [4108, 4134, 4135, 4097];
	if(bytes.length===22)
	{
		meas_list.push(((bytes[3] << 24) + (bytes[4] << 16) + (bytes[5] << 8) + bytes[6])/1000);
		meas_list.push(((bytes[7] << 24) + (bytes[8] << 16) + (bytes[9] << 8) + bytes[10])/1000);
		meas_list.push(((bytes[14] << 24) + (bytes[15] << 16) + (bytes[16] << 8) + bytes[17])/1000);
		meas_list.push(((bytes[18] << 24) + (bytes[19] << 16) + (bytes[20] << 8) + bytes[21])/1000);
	}
	else if(bytes.length===10)
	{
		meas_list.push(bytes[1]);
	}
	
	for(var i = 0; i<meas_list.length; i++)
	{
		if(bytes.length===10){
			decoded.messages.push({
				type: 'report_telemetry',
				measurementId: 6,
				measurementValue: meas_list[i]
			});
		}
		else{
			decoded.messages.push({
				type: 'report_telemetry',
				measurementId: meas_list[i],
				measurementValue: meas_list[i]
			});
		}
	}

    // return
    return {
        data: decoded
    };
}
function crc16Check(data) {
    return true;
}

// util
function bytes2HexString(arrBytes) {
    var str = '';
    for (var i = 0; i < arrBytes.length; i++) {
        var tmp;
        var num = arrBytes[i];
        if (num < 0) {
            tmp = (255 + num + 1).toString(16);
        } else {
            tmp = num.toString(16);
        }
        if (tmp.length === 1) {
            tmp = '0' + tmp;
        }
        str += tmp;
    }
    return str;
}

function ngsildInstance(value, time, unit, dataset_suffix) {
    var ngsild_instance = {
        type: 'Property',
        value: value,
        observedAt: time
    }
    if (unit !== null) {
        ngsild_instance.unitCode = unit
    }
    if (dataset_suffix !== null) {
        ngsild_instance.datasetId = 'urn:ngsi-ld:Dataset:' + dataset_suffix
    }
    return ngsild_instance
}

function ngsildWrapper(input, time, entity_id) {
    var ngsild_payload = [{
        id: entity_id,
        type: "Device"
    }];
    var messages = input.data.messages;
    var error = true
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].type === 'report_telemetry' && messages[i].measurementValue !== 0 && messages[i].measurementValue !== 2000001) {
            error = false
        }
    }
    if (error){
        ngsild_payload[0].error = ngsildInstance(1, time, null, null)
    } else {
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].type === 'report_telemetry') {
				if(messages[i].measurementId === 4108) {
					ngsild_payload[0].electricalConductivity = ngsildInstance(messages[i].measurementValue, time, 'H61', 'Raw');
				}
                else if (messages[i].measurementId === 4134) {
					ngsild_payload[0].salinity = ngsildInstance(messages[i].measurementValue, time, 'M1', 'Raw');
                }
				else if(messages[i].measurementId === 4135) {
					ngsild_payload[0].tds = ngsildInstance(messages[i].measurementValue, time, 'M1', 'Raw');
				}
                else if (messages[i].measurementId === 4097) {
					ngsild_payload[0].temperature = ngsildInstance(messages[i].measurementValue, time, 'CEL', 'Raw');
                }
				else if (messages[i].measurementId === 6) {
					ngsild_payload[0].battery = ngsildInstance(messages[i].measurementValue, time, 'P1', 'Raw');
                }
            }
        }
    }
    return ngsild_payload;
}

function main() {
    var fport = process.argv[2];
    var bytes = Uint8Array.from(Buffer.from(process.argv[3], 'hex'));
    var time = process.argv[4];
	var entity_id = "urn:ngsi-ld:Device:" + process.argv[5];
    var decoded = Decode(fport, bytes);
	var ngsild_payload = ngsildWrapper(decoded, time, entity_id);
    process.stdout.write(JSON.stringify(ngsild_payload));
}

if (require.main === module) {
    main();
}