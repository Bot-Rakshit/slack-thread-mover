# AWS Lambda Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Install Dependencies

```bash
npm install
npm install -g serverless
```

### 2. Configure AWS Credentials

```bash
# Option A: AWS CLI (recommended)
aws configure

# Option B: Direct environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
```

### 3. Set Environment Variables

Create a `.env` file in your project root:

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_USER_TOKEN=xoxp-your-user-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```

### 4. Deploy to AWS

```bash
npm run deploy
```

### 5. Configure Slack App

After deployment, you'll get a webhook URL like:

```
https://abc123.execute-api.us-east-1.amazonaws.com/prod/slack/events
```

Update your Slack app settings:

- **Request URL**: `https://your-lambda-url/slack/events`
- **Slash Commands**: `https://your-lambda-url/slack/commands`

## 📊 Cost Estimate

**AWS Lambda costs for typical Slack bot usage:**

- **Free Tier**: 1M requests/month + 400K GB-seconds/month FREE
- **After Free Tier**: ~$0.20 per million requests
- **Your bot**: Likely **$0-5/month** unless very high usage

**Much cheaper than running a 24/7 server!**

## 🔧 Alternative Deployment Options

### Option 1: AWS Lambda (Recommended)

- ✅ **Cost**: $0-5/month
- ✅ **Scaling**: Automatic
- ✅ **Maintenance**: Zero
- ❌ **Cold starts**: 1-2 second delay for first request

### Option 2: AWS ECS Fargate

```yaml
# If you prefer containers, I can help set this up
# Better for: Apps with persistent connections, heavy processing
# Cost: ~$15-30/month minimum
```

### Option 3: AWS EC2 (Not Recommended)

```bash
# Traditional server approach
# Cost: $5-50+/month
# Maintenance: High
# Only use if you need persistent state or very low latency
```

## 🛠️ Development & Testing

### Local Development

```bash
npm run dev
# Bot runs locally on http://localhost:3000
# Use ngrok to expose to Slack during development
```

### Test Before Deploy

```bash
# Run ESLint to check code
npx eslint lambda.js

# Test Lambda function locally
serverless invoke local --function slackBot
```

## 🔄 CI/CD Pipeline (Optional)

If you want automatic deployments, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS Lambda
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## ⚡ Why Lambda for Slack Bots?

1. **Event-Driven**: Slack sends HTTP requests → Lambda processes → responds
2. **Pay-per-use**: Only charged when bot is actually used
3. **Auto-scaling**: Handles traffic spikes automatically
4. **No servers**: AWS manages everything
5. **Fast deployment**: Deploy in seconds with `npm run deploy`

## 🆘 Troubleshooting

### Common Issues:

- **"Missing AWS credentials"**: Run `aws configure`
- **"Cold start timeout"**: Increase timeout in `serverless.yml`
- **"Permission denied"**: Check AWS IAM permissions
- **Slack verification failed**: Check signing secret

Need help? The Lambda logs are in CloudWatch!
