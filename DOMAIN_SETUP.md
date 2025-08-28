# Domain and HTTPS Setup Guide for EC2

This guide will walk you through setting up a domain name, pointing it to your EC2 instance, and securing it with a free SSL certificate from Let's Encrypt. This is required for your Slack bot to work over HTTPS.

**Prerequisites:** You have already deployed the bot to an EC2 instance following `DEPLOYMENT-EC2.md`.

## Step 1: Assign an Elastic IP to Your EC2 Instance

An Elastic IP is a static public IP address that won't change if you stop or restart your instance.

1.  In the AWS Console, go to the **EC2 Dashboard**.
2.  In the left navigation pane, click **"Elastic IPs"**.
3.  Click **"Allocate Elastic IP address"** and then **"Allocate"**.
4.  Select the new IP address from the list, click **"Actions"**, and then **"Associate Elastic IP address"**.
5.  Choose your EC2 instance from the "Instance" dropdown and click **"Associate"**.

Your EC2 instance now has a permanent IP address. Note it down.

## Step 2: Register a Domain with Amazon Route 53

If you don't have a domain, you can register one with AWS. If you already have one, you can skip to Step 3.

1.  In the AWS Console, go to the **Route 53 Dashboard**.
2.  Click **"Register domain"** and follow the steps to purchase a domain. This process can take a few minutes to a few hours.

## Step 3: Point Your Domain to the Elastic IP

We'll create a DNS "A record" that tells the internet that your domain lives at your EC2 instance's IP address.

1.  In the **Route 53 Dashboard**, go to **"Hosted zones"**.
2.  Click on the domain name you registered.
3.  Click **"Create record"**.
4.  Leave the "Record name" blank (this applies it to the root domain, e.g., `yourdomain.com`).
5.  **Record type:** `A`
6.  **Value:** Enter the **Elastic IP address** you created in Step 1.
7.  Click **"Create records"**.

_DNS changes can take anywhere from a few minutes to 24 hours to propagate across the internet._

## Step 4: Install and Configure Nginx on EC2

Nginx will act as a reverse proxy. It will receive public web traffic on ports 80 (HTTP) and 443 (HTTPS) and forward it to your Node.js app, which is running on port 3000.

Connect to your EC2 instance via SSH and run:

```bash
# Install Nginx
sudo amazon-linux-extras install nginx1 -y

# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

Now, create a configuration file for your bot:

```bash
sudo nano /etc/nginx/conf.d/slack-bot.conf
```

Paste the following configuration into the file. **Replace `your-domain.com` with your actual domain name.**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit (`CTRL+X`, `Y`, `Enter`). Then, test and restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

At this point, visiting `http://your-domain.com` should connect to your bot (though Slack won't work with it yet).

## Step 5: Install a Free SSL Certificate with Let's Encrypt

We will use `certbot` to automatically get a certificate and configure Nginx for HTTPS.

```bash
# Install EPEL repository for certbot
sudo yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm

# Install certbot for Nginx
sudo yum install -y certbot python2-certbot-nginx

# Run certbot (replace with your domain and email)
sudo certbot --nginx -d your-domain.com --non-interactive --agree-tos -m your-email@example.com
```

Certbot will automatically edit your `/etc/nginx/conf.d/slack-bot.conf` file to handle HTTPS traffic. It will also set up a cron job to automatically renew your certificate before it expires.

## Step 6: Update Your Slack App

You're all set! Your bot is now running on your EC2 instance and is securely accessible via your domain.

1.  Go to your **Slack App's settings page**.
2.  Go to **"Interactivity & Shortcuts"**.
3.  Set the **Request URL** to: `https://your-domain.com/slack/events`
4.  Go to **"Slash Commands"** and update the Request URL there as well.
5.  Go to **"OAuth & Permissions"** and ensure your **Redirect URLs** are updated if you use OAuth.
6.  **Important:** Make sure **Socket Mode is turned OFF** in "Socket Mode" settings.

Your bot is now fully deployed and configured on EC2 with a custom domain!
