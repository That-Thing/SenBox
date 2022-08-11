
# SenBox

A easy to use filehost and paste service written in NodeJS


## Installation

Clone the project and install dependencies

```bash
  git clone git@github.com:That-Thing/SenBox.git
  cd SenBox
  npm install
```
## Database
Install MySQL
```bash
sudo apt install mysql-server
sudo systemctl start mysql.service
```
Create the database  
Import the .sql file into that database
```bash
mysql -u username -p database_name < database.sql
```
## Discord Oauth2
Head to https://discord.com/developers/applications  
Create a new application, go to the Oauth2 section, add a redirect for `http(s)://your.domain/settings/auth`.  
Copy the client ID and the client secret *(you will need these for the config)*
##
Edit the config to your liking.  
*Make sure to change the salt, enter the database connection information, and set the Discord Oauth2 secret and ID*
```bash
nano config.json
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

It is suggested that you run SenBox through CloudFlare