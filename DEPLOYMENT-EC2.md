# AWS EC2 Deployment Guide

This guide explains how to deploy and run the Slack bot on an AWS EC2 instance.

## 🚀 Deployment Steps

### 1. Launch an EC2 Instance

1.  **Go to the EC2 Dashboard** in your AWS Console.
2.  **Launch instance**.
3.  **Choose an AMI:** "Amazon Linux 2" or "Ubuntu Server" are great choices.
4.  **Choose an Instance Type:** `t2.micro` or `t3.micro` are eligible for the AWS Free Tier and sufficient for this bot.
5.  **Create a Key Pair:** You'll need this `.pem` file to connect to your server. Download it and keep it safe.
6.  **Network Settings (Security Group):**
    - Click "Edit" next to Network settings.
    - Create a security group with the following **inbound rules**:
      - **Type:** `SSH`, Port: `22`, Source: `My IP` (for secure access)
      - **Type:** `HTTP`, Port: `80`, Source: `Anywhere`
      - **Type:** `HTTPS`, Port: `443`, Source: `Anywhere`
7.  **Launch the instance.**

### 2. Connect to Your EC2 Instance

Use the key pair you downloaded to connect via SSH.

```bash
# Make your key file private
chmod 400 /path/to/your-key.pem

# Connect to the instance
ssh -i /path/to/your-key.pem ec2-user@<your-ec2-public-ip-address>
```

_(For Ubuntu, the user is `ubuntu@...`)_

### 3. Install Dependencies on the Server

Once connected, run these commands on the EC2 instance:

```bash
# Update system packages
sudo yum update -y

# Install Node.js using nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 18
nvm use 18

# Install Git
sudo yum install git -y
```

### 4. Clone and Set Up the Project

```bash
# Clone your repository
git clone <your-repository-url>
cd slack-thread-mover

# Install project dependencies
npm install
```

### 5. Create the Environment File

Create a `.env` file on the server. **Do not commit this file to Git.**

```bash
nano .env
```

Paste your credentials into the file:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_USER_TOKEN=xoxp-your-user-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```

Press `CTRL+X`, then `Y`, then `Enter` to save and exit `nano`.

### 6. Run the App Persistently with PM2

We'll use `pm2`, a process manager, to keep your bot running forever and restart it if it crashes.

```bash
# Install pm2 globally
sudo npm install pm2 -g

# Start the application
pm2 start index.js --name "slack-bot"

# Tell pm2 to automatically restart on server reboot
pm2 startup
# (You may need to run the command it outputs)

# Save the current process list
pm2 save
```

**Useful PM2 Commands:**

- `pm2 list` - See the status of your app.
- `pm2 logs slack-bot` - View real-time logs.
- `pm2 restart slack-bot` - Restart the app.

### 7. Configure Slack App with Your EC2 Address

Your bot is now running, but Slack needs a public **HTTPS** URL to send events to.

1.  **Get a Public URL:** Your EC2 instance has a public IP address. For production, you should assign an **Elastic IP** in the EC2 dashboard so the address doesn't change.
2.  **Set up HTTPS:** Slack requires a secure `https://` URL. The easiest way to do this is to use **Nginx** as a reverse proxy and **Let's Encrypt** for a free SSL certificate. This is a more advanced topic, but here is a [good guide](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04).
3.  **Update Slack:** Once you have your `https://your-domain-or-ip.com`, update your Slack App settings:
    - Go to "Interactivity & Shortcuts".
    - **Request URL:** `https://your-domain-or-ip.com/slack/events`
    - Go to "Slash Commands".
    - Update the **Request URL** for your commands to the same URL.
    - Make sure **Socket Mode is turned OFF**.
