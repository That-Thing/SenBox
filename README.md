
# SenBox

A easy to use filehost and paste service written in NodeJS


## Installation

Clone the project and install dependencies

```bash
  git clone git@github.com:That-Thing/SenBox.git
  cd SenBox
  npm install
```
Create Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-enabled/senbox
```

```nginx
server {
    listen 8081;
    listen [::]:8081;
    server_name your.server.ip www.your.server.ip;

    location / {
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        include proxy_params;
        proxy_pass http://127.0.0.1:3000;
    }
}
```

Create SystemD service
```bash
sudo nano /etc/systemd/system/senbox.service
```
```
[Unit]
Description=A fast paste service and filehost
After=network.target

[Service]
Type=simple
User=YOUR USERNAME
ExecStart=/your/node/location /path/to/SenBox/app.js
Restart=on-failure
WorkingDirectory=/path/to/SenBox
[Install]
WantedBy=multi-user.target
```
Enable and start the service
```bash
sudo systemctl enable senbox
sudo systemctl start senbox
```

It is suggested that you run this through CloudFlare