# homebridge-smtpsensor

Is a plugin for [Homebridge](https://github.com/nfarina/homebridge) that creates HomeKit motion sensors (or contact sensors) that can be "tripped" by email messages with keywords in them. The plugin starts an SMTP server (does not forward messages) that you can configure devices to send emails to. It then scans the incoming emails for keywords, and triggers the correct HomeKit sensor device based on the keyword found.

This is good for various IP cameras that can send email messages when they detect motion (e.g., I'm using this with the D-Link DCS-934L). With this plugin you can expose those cameras to HomeKit as motion sensors! (Actually, this plugin exists to do essentially the same thing as my other plugin [FileSensor](https://github.com/sphtkr/homebridge-filesensor), except there was a problem with that one--Mac OS X's built-in FTP server was not sending `FsEvents` when a new file was uploaded, making the file monitoring approach impractical.)

## Configuration

Example:

    "platforms": [
        {
            "platform": "SmtpSensor",
            "port": "2525",
            "sensors": [
                {
                    "name": "Living Room Camera",
                    "keyword": "Living Room"
                }
                ,
                {
                    "name": "Kitchen Camera",
                    "keyword": "Kitchen"
                }
            ]
        }
    ]

### Global Configuration

| Key | Default | Description |
| --- | --- | --- |
| `port` | `2525` | The port on which to listen for SMTP connections. |
| `sensors` | N/A | The configuration for one or more sensors, see below. |

### Per-Sensor Configuration

This plugin is implemented as a platform so that you can create as many sensors as you want but still run only one SMTP listener on a single port. So, you must define each sensor you want to create in the `sensors` array.

| Key | Default | Description |
| --- | --- | --- |
| `name` | N/A | The display name of the sensor. **REQUIRED** |
| `keyword` | N/A | The string to look for in received email messages that triggers this sensor. This may appear in either the subject or message body (text, not HTML!). **REQUIRED** |
| `window_seconds` | `62` | The length of time that the sensor will stay triggered before falling back to its default state. |
| `sensor_type` | `"m"` | Currently either "m" for motion sensor or "c" for contact sensor. |
| `inverse` | `false` | If needed, you can invert the behavior of the sensor, for instance so that receiving an email means there is ''no'' motion or contact detected. |

### Configuring your camera or other Device

Point your SMTP sending capable device at your Homebridge server's IP and the port you configured in `config.json`. Configuring a given device is out of scope of this documentation, however keep the following in mind:

* Your device probably lets you set the frequency of mail messages. Marry this up with the `window_seconds` parameter if you don't want a lot of flapping (e.g. if your camera sends an email every 90 seconds, and the sensor falls back to "off" after the default 62 seconds, constant motion will result in on-off-on-off-on...).
* There is currently no SMTP authentication supported--the assumption is that this will run in a protected network, and since the messages are not (currently) forwarded on, there's no risk of spambots using it as a relay. So, don't try to specify a username or password, as this may prevent successful connections. If this is a problem for your device, open an issue and this may be added.
* SSL/TLS is not required. Enabling it ''should'' work and has worked in limited testing, but again: no relaying, no authentication, no encryption seems necessary. Again, open an issue if this causes you problems.

## Future

There are a number of possible enhancements, but I'm not sure what folks need.

* **Forwarding**: If you *also* want to receive the emails sent by your device, we may have to build in forwarding of messages. However, this will require enabling authentication and encryption, which is possible but non-trivial.
* **"Off" Triggering**: Currently, received mail messages only trigger "on" events, with a time-based fallback to the "off" position (or vice-versa if you use `inverse`). It would be possible to add a `keyword_off` key or similar to allow one message keyword to turn the sensor "on" and another message keyword to turn the sensor "off" again. If you need this, open an issue and describe your use case.
