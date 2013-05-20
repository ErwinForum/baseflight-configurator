// OS detection
var OS = "Unknown";
if (navigator.appVersion.indexOf("Win") != -1)   OS = "Windows";
if (navigator.appVersion.indexOf("Mac") != -1)   OS = "MacOS";
if (navigator.appVersion.indexOf("X11") != -1)   OS = "UNIX";
if (navigator.appVersion.indexOf("Linux") != -1) OS = "Linux";

var timers = new Array();

$(document).ready(function() { 
    var tabs = $('#tabs > ul');
    $('a', tabs).click(function() {
        if ($(this).parent().hasClass('active') == false) { // only initialize when the tab isn't already active
            if (connectionId < 1 || configuration_received == false) { // if there is no active connection, return
                return;
            }
            
            // Disable any active "data pulling" timer
            disable_timers();
            
            // Disable CLI (there is no "nicer way of doing so right now)
            if (CLI_active == true) {
                leave_CLI();
            }
            
            // Disable previous active button
            $('li', tabs).removeClass('active');
            
            // Highlight selected button
            $(this).parent().addClass('active');
            
            if ($(this).parent().hasClass('tab_initial_setup')) {
                $('#content').load("./tabs/initial_setup.html", tab_initialize_initial_setup);
            } else if ($(this).parent().hasClass('tab_pid_tuning')) {
                $('#content').load("./tabs/pid_tuning.html", tab_initialize_pid_tuning);
            } else if ($(this).parent().hasClass('tab_receiver')) {
                $('#content').load("./tabs/receiver.html", tab_initialize_receiver);
            } else if ($(this).parent().hasClass('tab_auxiliary_configuration')) {
                tab_load_auxiliary_configuration();
            } else if ($(this).parent().hasClass('tab_motor_outputs')) {
                $('#content').load("./tabs/motor_outputs.html", tab_initialize_motor_outputs);
            } else if ($(this).parent().hasClass('tab_sensors')) {
                $('#content').load("./tabs/sensors.html", tab_initialize_sensors);
            } else if ($(this).parent().hasClass('tab_cli')) {
                $('#content').load("./tabs/cli.html", tab_initialize_cli);
            } else if ($(this).parent().hasClass('tab_about')) {
                $('#content').load("./tabs/about.html");
            }
        }
    });
    
    // temporary
    //$('#content').load("./tabs/initial_setup.html", tab_initialize_initial_setup);
});

function disable_timers() {
    for (var i = 0; i < timers.length; i++) {
        clearInterval(timers[i]);
    }
    
    // kill all the refferences
    timers = [];
    
    return true;
}    