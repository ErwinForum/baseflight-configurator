function configuration_backup() {
    // request configuration data
    send_message(MSP_codes.MSP_IDENT, MSP_codes.MSP_IDENT);
    send_message(MSP_codes.MSP_STATUS, MSP_codes.MSP_STATUS);
    send_message(MSP_codes.MSP_PID, MSP_codes.MSP_PID);
    send_message(MSP_codes.MSP_RC_TUNING, MSP_codes.MSP_RC_TUNING);
    send_message(MSP_codes.MSP_BOXNAMES, MSP_codes.MSP_BOXNAMES);
    send_message(MSP_codes.MSP_BOX, MSP_codes.MSP_BOX);
    send_message(MSP_codes.MSP_ACC_TRIM, MSP_codes.MSP_ACC_TRIM);
    
    // applying 200ms delay (should be enough to pull all the data down)
    // we might increase this in case someone would be using very slow baudrate (ergo 9600 and lower)
    setTimeout(function() {
        var chosenFileEntry = null;
        
        var accepts = [{
            extensions: ['txt']
        }];
        
        // generate timestamp for the backup file
        var d = new Date();
        var now = d.getUTCFullYear() + '.' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getHours() + '.' + d.getMinutes();  

        // create or load the file
        chrome.fileSystem.chooseEntry({type: 'saveFile', suggestedName: 'bf_mw_backup_' + now, accepts: accepts}, function(fileEntry) {
            if (!fileEntry) {
                console.log('No file selected, backup aborted.');
                
                return;
            }
            
            chosenFileEntry = fileEntry; 

            // echo/console log path specified
            chrome.fileSystem.getDisplayPath(chosenFileEntry, function(path) {
                console.log('Backup file path: ' + path);
            });

            // change file entry from read only to read/write
            chrome.fileSystem.getWritableEntry(chosenFileEntry, function(fileEntryWritable) {
                // check if file is writable
                chrome.fileSystem.isWritableEntry(fileEntryWritable, function(isWritable) {
                    if (isWritable) {
                        chosenFileEntry = fileEntryWritable;
                    
                        // create config object that will be used to store all downloaded data
                        var configuration = {
                            VERSION: CONFIG.version, // not really useful yet
                            PID: PIDs,
                            AUX_val: AUX_CONFIG_values,
                            RC: RC_tuning,
                            AccelTrim: CONFIG.accelerometerTrims
                        }
                        
                        // crunch the config object
                        var serialized_config_object = JSON.stringify(configuration);
                        var blob = new Blob([serialized_config_object], {type: 'text/plain'}); // first parameter for Blob needs to be an array
                        
                        chosenFileEntry.createWriter(function(writer) {
                            writer.onerror = function (e) {
                                console.error(e);
                            };
                            
                            writer.onwriteend = function() {
                                console.log('Write SUCCESSFUL');
                            };
                            
                            writer.write(blob);
                        }, function (e) {
                            console.error(e);
                        });
                    } else {
                        // Something went wrong or file is set to read only and cannot be changed
                        console.log('File appears to be read only, sorry.');
                    }
                });
            });
        });
    }, 200);
}

function configuration_restore() {
    var chosenFileEntry = null;
    
    var accepts = [{
        extensions: ['txt']
    }];
    
    // load up the file
    chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(fileEntry) {
        if (!fileEntry) {
            console.log('No file selected, restore aborted.');
            
            return;
        }
        
        chosenFileEntry = fileEntry; 
        
        // echo/console log path specified
        chrome.fileSystem.getDisplayPath(chosenFileEntry, function(path) {
            console.log('Restore file path: ' + path);
        }); 

        // read contents into variable
        chosenFileEntry.file(function(file) {
            var reader = new FileReader();

            reader.onerror = function (e) {
                console.error(e);
            };
            
            reader.onloadend = function(e) {
                console.log('Read SUCCESSFUL');
                
                try { // check if string provided is a valid JSON
                    var deserialized_configuration_object = JSON.parse(e.target.result);
                } catch (e) {
                    // data provided != valid json object
                    console.log('Data provided != valid JSON string, restore aborted.');
                    
                    return;
                }
                
                // replacing "old configuration" with configuration from backup file
                var configuration = deserialized_configuration_object;
                
                // some configuration.VERSION code goes here? will see
                
                PIDs = configuration.PID;
                AUX_CONFIG_values = configuration.AUX_val;
                RC_tuning = configuration.RC;
                CONFIG.accelerometerTrims = configuration.AccelTrim;
                
                // all of the arrays/objects are set, upload changes
                configuration_upload();
            };

            reader.readAsText(file);
        });
    });
}

function configuration_upload() {
    // this "cloned" function contains all the upload sequences for the respective array/objects
    // that are currently scattered in separate tabs (ergo - pid_tuning.js/initial_setup.js/etc)
    // for current purposes, this approach works, but its not really "valid" and this approach
    // should be reworked in the future, so the same code won't be cloned over !!!

    // PID section
    var PID_buffer_out = new Array();
    var PID_buffer_needle = 0;
    for (var i = 0; i < PIDs.length; i++) {
        switch (i) {
            case 0: 
            case 1: 
            case 2: 
            case 3: 
            case 7: 
            case 8:
            case 9:
                PID_buffer_out[PID_buffer_needle]     = parseInt(PIDs[i][0] * 10);
                PID_buffer_out[PID_buffer_needle + 1] = parseInt(PIDs[i][1] * 1000);
                PID_buffer_out[PID_buffer_needle + 2] = parseInt(PIDs[i][2]);
                break;
            case 4:
                PID_buffer_out[PID_buffer_needle]     = parseInt(PIDs[i][0] * 100);
                PID_buffer_out[PID_buffer_needle + 1] = parseInt(PIDs[i][1] * 100);
                PID_buffer_out[PID_buffer_needle + 2] = parseInt(PIDs[i][2]);
                break;
            case 5: 
            case 6:
                PID_buffer_out[PID_buffer_needle]     = parseInt(PIDs[i][0] * 10);
                PID_buffer_out[PID_buffer_needle + 1] = parseInt(PIDs[i][1] * 100);
                PID_buffer_out[PID_buffer_needle + 2] = parseInt(PIDs[i][2] * 1000);
                break;                     
        }
        PID_buffer_needle += 3;
    }
    
    // Send over the PID changes
    send_message(MSP_codes.MSP_SET_PID, PID_buffer_out); 

    
    // RC Tuning section
    var RC_tuning_buffer_out = new Array();
    RC_tuning_buffer_out[0] = parseInt(RC_tuning.RC_RATE * 100);
    RC_tuning_buffer_out[1] = parseInt(RC_tuning.RC_EXPO * 100);
    RC_tuning_buffer_out[2] = parseInt(RC_tuning.roll_pitch_rate * 100);
    RC_tuning_buffer_out[3] = parseInt(RC_tuning.yaw_rate * 100);
    RC_tuning_buffer_out[4] = parseInt(RC_tuning.dynamic_THR_PID * 100);
    RC_tuning_buffer_out[5] = parseInt(RC_tuning.throttle_MID * 100);
    RC_tuning_buffer_out[6] = parseInt(RC_tuning.throttle_EXPO * 100);
    
    // Send over the RC_tuning changes
    send_message(MSP_codes.MSP_SET_RC_TUNING, RC_tuning_buffer_out);

    
    // AUX section
    var AUX_val_buffer_out = new Array();
    
    var needle = 0;
    for (var i = 0; i < AUX_CONFIG_values.length; i++) {
        AUX_val_buffer_out[needle++] = lowByte(AUX_CONFIG_values[i]);
        AUX_val_buffer_out[needle++] = highByte(AUX_CONFIG_values[i]);
    }
    
    // Send over the AUX changes
    send_message(MSP_codes.MSP_SET_BOX, AUX_val_buffer_out);     
 
 
    // Trim section (baseflight specific)
    var buffer_out = new Array();
    buffer_out[0] = lowByte(CONFIG.accelerometerTrims[0]);
    buffer_out[1] = highByte(CONFIG.accelerometerTrims[0]);
    buffer_out[2] = lowByte(CONFIG.accelerometerTrims[1]);
    buffer_out[3] = highByte(CONFIG.accelerometerTrims[1]); 

    // Send over the new trims
    send_message(MSP_codes.MSP_SET_ACC_TRIM, buffer_out);    
    
    
    // Save changes to EEPROM
    send_message(MSP_codes.MSP_EEPROM_WRITE, MSP_codes.MSP_EEPROM_WRITE);   
    
}