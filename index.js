var Service;
var Characteristic;
var SMTPServer = require('smtp-server').SMTPServer;
var MailParser = require("mailparser").MailParser;
var debug = require("debug")("SmtpSensorAccessory");
var crypto = require("crypto");

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-smtpsensor", "SmtpSensor", SmtpSensorAccessory);
    homebridge.registerPlatform("homebridge-smtpsensor", "SmtpSensor", SmtpSensorPlatform);
}

function SmtpSensorPlatform(log, config){
    this.log = log;
    this.port = config["port"] || 2525;
    this.sensors = config["sensors"] || [];
}

SmtpSensorPlatform.prototype = {

    accessories: function(callback) {
        var sensorAccessories = [];
        for(var i = 0; i < this.sensors.length; i++){
            var sensor = new SmtpSensorAccessory(this.log, this.sensors[i]);
            sensorAccessories.push(sensor);
        }
        var saCount = sensorAccessories.length;
        callback(sensorAccessories);

        var server = new SMTPServer({
            disabledCommands: ['AUTH']
            ,
            onData: function(stream, session, callback){
                debug("Data received...");
                var mailparser = new MailParser();
                mailparser.on("end", function(mail_object){
                    debug("Subject: ", mail_object.subject);
                    debug("Text: ", mail_object.text);
                    for(var i = 0; i < saCount; i++){
                        if(sensorAccessories[i].pattern.test(mail_object.subject)){
                            debug("Sensor triggered on subject!");
                            sensorAccessories[i].changeHandler();
                        }
                        if(sensorAccessories[i].pattern.test(mail_object.text)){
                            debug("Sensor triggered on body text!");
                            sensorAccessories[i].changeHandler();
                        }
                    }
                });
                stream.pipe(mailparser);
                stream.on('end', callback);
            }
            ,
            onAuth: function(auth, session, callback){
                debug("Authentication attempted...");
                callback(null, {user: "anonymous"});
            }
        });
        server.listen(this.port);
    }
}

function SmtpSensorAccessory(log, sensorConfig) {
    this.log = log;

  // url info
    this.keyword = sensorConfig["keyword"];
    this.pattern = new RegExp(this.keyword, 'i');
    this.name = sensorConfig["name"];
    this.window_seconds = sensorConfig["window_seconds"] || 62;
    this.sensor_type = sensorConfig["sensor_type"] || "m";
    this.inverse = sensorConfig["inverse"] || false;

    if(sensorConfig["sn"]){
        this.sn = sensorConfig["sn"];
    } else {
        var shasum = crypto.createHash('sha1');
        shasum.update(this.keyword);
        this.sn = shasum.digest('base64');
        debug('Computed SN ' + this.sn);
    }
}

SmtpSensorAccessory.prototype = {

    getServices: function() {

        // you can OPTIONALLY create an information service if you wish to override
        // the default values for things like serial number, model, etc.
        var informationService = new Service.AccessoryInformation();

        informationService
          .setCharacteristic(Characteristic.Name, this.name)
          .setCharacteristic(Characteristic.Manufacturer, "Homebridge")
          .setCharacteristic(Characteristic.Model, "SMTP Sensor")
          .setCharacteristic(Characteristic.SerialNumber, this.sn);

        var service, changeAction;
        if(this.sensor_type === "c"){
            service = new Service.ContactSensor();
            changeAction = function(newState){
                service.getCharacteristic(Characteristic.ContactSensorState)
                        .setValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
            };
        } else {
            service = new Service.MotionSensor();
            changeAction = function(newState){
                service.getCharacteristic(Characteristic.MotionDetected)
                        .setValue(newState);
            };
        }

        this.changeHandler = function(){
            var d = new Date();
            var newState = this.inverse ? false : true;
            if(this.timer == undefined){
                changeAction(newState);
            } else {
                clearTimeout(this.timer);
            }
            this.timer = setTimeout(function(){
                changeAction(!newState);
                delete this.timer;
            }.bind(this), this.window_seconds * 1000);
        }.bind(this);

        return [informationService, service];
    }
};
