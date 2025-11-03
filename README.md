# WebScan - QR Payment App

A responsive web application for scanning QR codes and making payments.

## Tech Stack

- **React 18** - Modern UI library
- **Vite** - Fast build tool and development server
- **CSS3** - Responsive styling with mobile-first approach

## Features

- ✅ Centered "Scan QR and Pay" button
- ✅ Top-right balance display (Total Balance: 1000)
- ✅ Fully responsive design for all device types
- ✅ Modern, clean UI with gradient background

## Setup Instructions

1. **Navigate to the project directory:**
   ```bash
   cd WebScan
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

   If you don't have npm installed, download Node.js from [nodejs.org](https://nodejs.org/)

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the website:**
   - The server will start and show you a local URL (usually `http://localhost:5173`)
   - Open this URL in your browser

## Running on Mobile

To access the website on your mobile device:

### Method 1: Using Network IP (Recommended)

1. **Find your computer's local IP address:**
   - Windows: Open Command Prompt and run `ipconfig`
   - Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.0.x.x)
   
2. **Start the dev server:**
   ```bash
   npm run dev
   ```

3. **On your mobile device:**
   - Make sure your phone is connected to the same WiFi network as your computer
   - Open your mobile browser
   - Enter: `http://YOUR_IP_ADDRESS:5173` (replace YOUR_IP_ADDRESS with the IP you found)
   - Example: `http://192.168.1.100:5173`

### Method 2: Using ngrok (For external access)

1. **Install ngrok:**
   - Download from [ngrok.com](https://ngrok.com/)
   - Or use: `npm install -g ngrok`

2. **Start the dev server:**
   ```bash
   npm run dev
   ```

3. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 5173
   ```

4. **Use the ngrok URL** shown in the terminal on your mobile browser

### Method 3: Build for Production

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Preview the production build:**
   ```bash
   npm run preview
   ```

3. **Deploy to a hosting service** like:
   - Netlify
   - Vercel
   - GitHub Pages
   - Any static hosting service

## Project Structure

```
WebScan/
├── index.html          # Entry HTML file
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── src/
│   ├── main.jsx       # React entry point
│   ├── App.jsx        # Main app component
│   ├── App.css        # App styles (responsive)
│   └── index.css      # Global styles
└── README.md          # This file
```

## Responsive Breakpoints

- **Desktop**: > 768px (full layout)
- **Tablet**: 481px - 768px (adjusted spacing)
- **Mobile**: ≤ 480px (optimized for small screens)
- **Small Mobile**: ≤ 320px (compact layout)
- **Landscape**: Special handling for landscape orientation

## Next Steps

The QR scanning functionality can be added using libraries like:
- `html5-qrcode` - For web-based QR scanning
- `react-qr-reader` - React-specific QR scanner component

## License

This project is open source and available for personal use.

