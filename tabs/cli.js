function tab_initialize_cli() {
    ga_tracker.sendAppView('CLI Page');
    
    CLI_active = true;
    
    // Enter CLI mode
    var bufferOut = new ArrayBuffer(1);
    var bufView = new Uint8Array(bufferOut);
    
    bufView[0] = 0x23; // #

    chrome.serial.write(connectionId, bufferOut, function(writeInfo) {
    });

    $('.tab-cli textarea').keypress(function(event) {
        if (event.which == 13) { // enter
            var out_string = $('.tab-cli textarea').val();
            var out_arr = out_string.split("\n");
            var timeout_needle = 0;
            
            for (var i = 0; i < out_arr.length; i++) {
                send_slowly(out_arr, i, timeout_needle++);
            }
            
            $('.tab-cli textarea').val('');
        }
    });
    
    // give input element user focus
    $('.tab-cli textarea').focus();
    
    // if user clicks inside the console window, input element gets re-focused
    $('.tab-cli .window').click(function() {
        $('.tab-cli textarea').focus();
    });
    
    $('.tab-cli .copy').click(function() {
        var text = $('.tab-cli .window .wrapper').html();
        text = text.replace(/<br\s*\/?>/mg,"\n"); // replacing br tags with \n to keep some of the formating
        
        var copyFrom = $('<textarea/>');
        
        copyFrom.text(text);
        $('body').append(copyFrom);
        copyFrom.select();
        document.execCommand('copy');
        copyFrom.remove();
    });
}

function send_slowly(out_arr, i, timeout_needle) {
    setTimeout(function() {
        var bufferOut = new ArrayBuffer(out_arr[i].length + 1); 
        var bufView = new Uint8Array(bufferOut);

        for (var c_key = 0; c_key < out_arr[i].length; c_key++) {
            bufView[c_key] = out_arr[i].charCodeAt(c_key);
        }

        bufView[out_arr[i].length] = 0x0D; // enter (\n)

        chrome.serial.write(connectionId, bufferOut, function(writeInfo) {});
    }, timeout_needle * 5);
}

function leave_CLI(callback) {
    var bufferOut = new ArrayBuffer(5);
    var bufView = new Uint8Array(bufferOut);
    
    bufView[0] = 0x65; // e
    bufView[1] = 0x78; // x
    bufView[2] = 0x69; // i
    bufView[3] = 0x74; // t
    bufView[4] = 0x0D; // enter

    chrome.serial.write(connectionId, bufferOut, function(writeInfo) {
        if (typeof callback !== 'undefined') {
            callback();
        }
    });   

    CLI_active = false;    
}


/*  Some info about handling line feeds and carriage return

    line feed = LF = \n = 0x0A = 10
    carriage return = CR = \r = 0x0D = 13
    
    MAC only understands CR
    Linux and Unix only understand LF
    Windows understands (both) CRLF
*/

var sequence_elements = 0;

function handle_CLI(data) {
    if (data == 27 || sequence_elements > 0) { // ESC + other
        sequence_elements++;
        
        // delete previous space
        if (sequence_elements == 1) {
            var content_string = $('.tab-cli .window .wrapper').html();
            var new_string = content_string.substring(0, content_string.length -1);
            $('.tab-cli .window .wrapper').html(new_string);
        }
        
        // Reset
        if (sequence_elements >= 5) {
            sequence_elements = 0;
        }
    }
    if (sequence_elements == 0) {
        switch (data) {
            case 10: // line feed
                if (OS == "Windows" || OS == "Linux" || OS == "UNIX") {
                    $('.tab-cli .window .wrapper').append("<br />");
                }
                break;
            case 13: // carriage return
                if (OS == "MacOS") {
                    $('.tab-cli .window .wrapper').append("<br />");
                }
                break;
            default:
                $('.tab-cli .window .wrapper').append(String.fromCharCode(data));
                $('.tab-cli .window').scrollTop($('.tab-cli .window .wrapper').height());
        }
    }
}