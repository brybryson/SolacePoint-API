const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5005;

// Enable CORS securely for our React frontend
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Initialize Nodemailer SMTP Transporter using Gmail
let transporter;
const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_APP_PASSWORD;

if (gmailUser && gmailPass && gmailPass !== 'YOUR_GMAIL_APP_PASSWORD') {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });
  console.log('📬 Nodemailer Gmail SMTP Transporter initialized successfully.');
} else {
  console.warn('⚠️ WARNING: Gmail SMTP User or App Password is missing in .env. Email notifications will be skipped, but leads will still save to the database.');
}

// Centralized configurations
const REPLY_TO_EMAIL = 'solacepoint.insuranceagency@gmail.com';
const INTERNAL_ALERT_RECIPIENT = 'solacepoint.insuranceagency@gmail.com'; // Your inbox where you want to read all incoming client leads

// Beautiful premium HTML Widescreen Template Wrapper (Full-Width Landscape Format matching Website theme)
function buildHtmlTemplate(title, subtitle, contentHtml, isAlert = false) {
  const accentColor = '#DDB959'; // Solace Gold from website
  const primaryColor = '#1E3F62'; // Primary Deep Blue from website
  const bgColor = isAlert ? '#f5f3f4' : '#fbf9fa'; // Website's surface-container-low vs background

  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Solace Point</title>
        <!-- Import Montserrat directly -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        
        <style type="text/css">
          /* Client-specific Styles */
          body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; }
          
          /* Reset Styles */
          img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
          table { border-collapse: collapse !important; }
          body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
          
          /* Widescreen styles */
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff;
          }
          
          /* Custom Typography Fallbacks */
          .font-montserrat {
            font-family: 'Montserrat', "Helvetica Neue", Helvetica, Arial, sans-serif !important;
          }
        </style>
      </head>
      <body style="margin: 0 !important; padding: 0 !important; background-color: ${bgColor}; font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div class="email-container">
          
          <!-- Header Banner (Cinematic Full-Width Layout Mirroring Website Navbar) -->
          <div style="background-color: ${primaryColor}; padding: 48px 8%; border-bottom: 4px solid ${accentColor};">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <!-- Brand Identity Column -->
                <td style="vertical-align: middle; text-align: left;">
                  <table style="border-collapse: collapse;">
                    <tr>
                      <td style="padding-right: 24px; vertical-align: middle;">
                        <img src="cid:logo" alt="Solace Point Logo" style="height: 85px; object-fit: contain; display: block;" />
                      </td>
                      <td style="vertical-align: middle; border-left: 2px solid rgba(255, 255, 255, 0.15); padding-left: 24px;">
                        <span class="font-montserrat" style="font-size: 26px; font-weight: 900; letter-spacing: 0.1em; color: #ffffff; display: block; text-transform: uppercase; line-height: 1.1;">Solace Point</span>
                        <span class="font-montserrat" style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.35em; color: ${accentColor}; display: block; margin-top: 8px;">Architects of Stability</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <!-- Action Description Column -->
                <td style="text-align: right; vertical-align: middle;">
                  <span class="font-montserrat" style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.25em; color: ${accentColor}; display: block; margin-bottom: 8px;">
                    ${subtitle}
                  </span>
                  <h1 class="font-montserrat" style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; line-height: 1.2;">
                    ${title}
                  </h1>
                </td>
              </tr>
            </table>
          </div>

          <!-- Main Content Area (Full-Width Fluid Padding) -->
          <div style="padding: 55px 8%; background-color: #ffffff;">
            ${contentHtml}
          </div>

          <!-- Footer block (Full-Width Fluid Sleeker Layout) -->
          <div style="background-color: #fcfbfb; border-top: 1px solid #eef2f6; padding: 35px 8%; text-align: center;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="text-align: center;">
                  <span class="font-montserrat" style="font-size: 16px; font-weight: 800; color: ${primaryColor}; display: inline-block; vertical-align: middle;">Solace Point</span>
                  <span class="font-montserrat" style="font-size: 16px; font-weight: 300; font-style: italic; color: ${accentColor}; margin-left: 8px; display: inline-block; vertical-align: middle;">Insurance Agency</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 15px;">
                  <p class="font-montserrat" style="margin: 0; font-size: 11.5px; color: #5c6066; line-height: 1.8; letter-spacing: 0.03em;">
                    Stability in Security. Clarity in Service. &nbsp;|&nbsp; 
                    <span style="color: ${primaryColor}; font-weight: 700;">${REPLY_TO_EMAIL}</span> &nbsp;|&nbsp; (02) 8800 1234
                  </p>
                </td>
              </tr>
            </table>
          </div>

        </div>
      </body>
    </html>
  `;
}

// Helper to send emails defensively
async function safeSendEmail(emailPayload) {
  if (!transporter) {
    console.log('✉️ Email send skipped (No valid Gmail SMTP configured):', emailPayload.subject);
    return null;
  }

  // Extract visual Display Name from Resend-style from string
  let displayName = 'Solace Point';
  if (emailPayload.from.includes('<')) {
    displayName = emailPayload.from.split('<')[0].trim();
  }

  // Configure standard Nodemailer mail options
  const mailOptions = {
    from: `"${displayName}" <${gmailUser}>`,
    to: emailPayload.to,
    subject: emailPayload.subject,
    html: emailPayload.html,
    replyTo: REPLY_TO_EMAIL,
    attachments: [
      {
        filename: 'SolacePointLogo.png',
        path: '/Users/macbookpro/Documents/SOLACE PROJECT/SolacePoint-WEB/src/assets/SolacePointLogo.png',
        cid: 'logo'
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Email sent successfully:', emailPayload.subject, 'MessageID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Failed to send email via Gmail SMTP:', emailPayload.subject, error.message);
    return null;
  }
}

// Helper to verify Supabase client is initialized
function verifyDatabase() {
  if (!db.supabase) {
    throw new Error('Supabase client is not configured. Please supply a valid SUPABASE_SERVICE_ROLE_KEY in .env.');
  }
}

// -------------------------------------------------------------
// 1. CONTACT FORM ROUTE
// -------------------------------------------------------------
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  try {
    verifyDatabase();

    // A. Insert into Supabase Database
    const { data, error } = await db.supabase
      .from('contact_submissions')
      .insert([{ name, email, message }])
      .select('id')
      .single();

    if (error) throw error;
    const leadId = data.id;
    console.log(`💾 Contact lead stored in Supabase. ID: ${leadId}`);

    // B. Send lead notification to your verified Gmail inbox
    const alertHtml = buildHtmlTemplate(
      'New Contact Lead',
      `Reference #${leadId}`,
      `
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Left Column: Context & Message -->
            <td style="width: 50%; vertical-align: top; padding-right: 40px;">
              <h3 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 18px; letter-spacing: -0.02em;">Inquiry Overview</h3>
              <p style="font-family: 'Montserrat', sans-serif; font-size: 14.5px; color: #43474e; line-height: 1.8; margin-bottom: 28px; font-weight: 400;">A client has submitted an online inquiry. Our brand promise commits to securing absolute resolution for every contact within 24 hours.</p>
              
              <p style="margin: 0 0 10px 0; font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 800; color: #1E3F62; text-transform: uppercase; letter-spacing: 0.1em;">Client Message:</p>
              <div style="background-color: #fbf9fa; border: 1px solid #dee3eb; padding: 25px; border-left: 4px solid #DDB959; font-style: italic; border-radius: 8px; line-height: 1.8; color: #2c3e50; font-size: 14.5px; font-family: 'Montserrat', sans-serif; font-weight: 400;">
                "${message.replace(/\n/g, '<br/>')}"
              </div>
              <p style="font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; color: #7f8c8d; line-height: 1.7; margin-top: 30px; margin-bottom: 0;">Please execute a professional follow-up call with the client inside the standard 24-hour response window.</p>
            </td>
            
            <!-- Right Column: Structured Table Card -->
            <td style="width: 50%; vertical-align: top; padding-left: 40px; border-left: 1px solid #dee3eb;">
              <div style="border: 1px solid #eef2f6; border-radius: 16px; padding: 35px; background-color: #fbf9fa; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);">
                <h3 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 0; margin-bottom: 20px; border-bottom: 2px solid #dee3eb; padding-bottom: 12px; font-weight: 800;">Submission Details</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-family: 'Montserrat', sans-serif; font-size: 13.5px; color: #43474e;">
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; width: 40%; border-bottom: 1px solid #dee3eb;">Lead ID:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #AF7F2A; font-weight: 800;">#${leadId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Client Name:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #1E3F62; font-weight: 600;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Email Address:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #1E3F62; font-weight: 500;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Source Portal:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; font-weight: 500;">Web Form (/contact)</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      `,
      true
    );

    await safeSendEmail({
      from: 'Solace Point Intake',
      to: INTERNAL_ALERT_RECIPIENT,
      subject: `[Lead #${leadId}] New Contact Submission: ${name}`,
      html: alertHtml
    });

    // C. Send elegant auto-reply receipt to client
    const receiptHtml = buildHtmlTemplate(
      'Message Received',
      'Confirmation Copy',
      `
        <p style="font-family: 'Montserrat', sans-serif; font-size: 22px; margin-top: 0; color: #1E3F62; font-weight: 800; letter-spacing: -0.01em;">Hello ${name},</p>
        <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 35px; font-weight: 400;">Thank you for contacting Solace Point Insurance Agency. We appreciate you taking the time to share your questions and protection needs with us.</p>
        
        <div style="background-color: #f9fbfd; border: 1px solid #e1e7ee; border-top: 4px solid #DDB959; border-radius: 12px; padding: 35px 40px; margin: 35px 0; text-align: center;">
          <p style="margin: 0; font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 800; color: #1E3F62; letter-spacing: 0.02em;">Lead Compilation Successful</p>
          <p style="margin: 12px 0 0 0; font-family: 'Montserrat', sans-serif; font-size: 14.5px; color: #43474e; line-height: 1.8; font-weight: 400;">Your message has been securely parsed into our lead registry. <strong>A licensed risk advisor will review your request and contact you personally via phone call within 24 hours.</strong></p>
        </div>

        <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; margin-top: 45px; font-weight: 400;">
          *This is an automated confirmation receipt. Please do not reply directly to this email, as this address is unmonitored. For any immediate assistance, feel free to reach out to us at the address below.
        </p>
      `,
      false
    );

    await safeSendEmail({
      from: 'Solace Point',
      to: email,
      subject: 'Thank You for Reaching Out - Solace Point',
      html: receiptHtml
    });

    res.status(201).json({ success: true, message: 'Contact request compiled successfully.', leadId });
  } catch (error) {
    console.error('❌ Error handling contact submission:', error.message || error);
    res.status(500).json({ success: false, error: error.message || 'Database or server configuration issue.' });
  }
});

// -------------------------------------------------------------
// 2. INSURANCE QUOTE ROUTE
// -------------------------------------------------------------
app.post('/api/quote', async (req, res) => {
  const {
    name,
    email,
    phone,
    insuranceType,
    otherInsuranceType,
    propertyType,
    otherPropertyType,
    estimatedAmount,
    details
  } = req.body;

  if (!name || !email || !phone || !insuranceType || !propertyType || !estimatedAmount) {
    return res.status(400).json({ success: false, error: 'Missing required fields for generating a quote.' });
  }

  try {
    verifyDatabase();

    // A. Insert into Supabase Database
    const { data, error } = await db.supabase
      .from('quote_submissions')
      .insert([{ 
        name, 
        email, 
        phone_number: phone, 
        insurance_type: insuranceType, 
        other_insurance_type: otherInsuranceType || null, 
        property_type: propertyType, 
        other_property_type: otherPropertyType || null, 
        estimated_amount: parseFloat(estimatedAmount), 
        details: details || null 
      }])
      .select('id')
      .single();

    if (error) throw error;
    const quoteId = data.id;
    console.log(`💾 Quote request stored in Supabase. ID: ${quoteId}`);

    // B. Send lead notification to your verified Gmail inbox
    const alertHtml = buildHtmlTemplate(
      'New Quote Request',
      `Reference #${quoteId}`,
      `
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Left Column: Context & Specifications -->
            <td style="width: 45%; vertical-align: top; padding-right: 40px;">
              <h3 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 18px; letter-spacing: -0.02em;">Quote Overview</h3>
              <p style="font-family: 'Montserrat', sans-serif; font-size: 14.5px; color: #43474e; line-height: 1.8; margin-bottom: 28px; font-weight: 400;">A client has requested a custom non-life insurance portfolio review. Our team of risk architects is tasked with compiling optimized rates across our premium network.</p>
              
              <p style="margin: 0 0 10px 0; font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 800; color: #1E3F62; text-transform: uppercase; letter-spacing: 0.1em;">Coverage Specifications:</p>
              <div style="background-color: #fbf9fa; border: 1px solid #dee3eb; padding: 25px; border-left: 4px solid #DDB959; font-style: italic; border-radius: 8px; line-height: 1.8; color: #2c3e50; font-size: 14.5px; font-family: 'Montserrat', sans-serif; font-weight: 400;">
                "${details ? details.replace(/\n/g, '<br/>') : 'None provided'}"
              </div>
              <p style="font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; color: #7f8c8d; line-height: 1.7; margin-top: 30px; margin-bottom: 0;">Please compile rate proposals and contact the client immediately to deliver their portfolio review.</p>
            </td>
            
            <!-- Right Column: Structured Table Card -->
            <td style="width: 55%; vertical-align: top; padding-left: 40px; border-left: 1px solid #dee3eb;">
              <div style="border: 1px solid #eef2f6; border-radius: 16px; padding: 35px; background-color: #fbf9fa; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);">
                <h3 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 0; margin-bottom: 20px; border-bottom: 2px solid #dee3eb; padding-bottom: 12px; font-weight: 800;">Submission Details</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-family: 'Montserrat', sans-serif; font-size: 13.5px; color: #43474e;">
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; width: 40%; border-bottom: 1px solid #dee3eb;">Quote ID:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #AF7F2A; font-weight: 800;">#${quoteId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Client Name:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #1E3F62; font-weight: 600;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Email Address:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #1E3F62; font-weight: 500;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Phone Number:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #1E3F62; font-weight: 500;">${phone}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Insurance Type:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; text-transform: capitalize; color: #1E3F62; font-weight: 500;">${insuranceType} ${otherInsuranceType ? `(${otherInsuranceType})` : ''}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Property Type:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; text-transform: capitalize; color: #1E3F62; font-weight: 500;">${propertyType} ${otherPropertyType ? `(${otherPropertyType})` : ''}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Estimated Amount:</td>
                    <td style="padding: 14px 0; color: #AF7F2A; font-weight: 800; border-bottom: 1px solid #dee3eb;">₱${parseFloat(estimatedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      `,
      true
    );

    await safeSendEmail({
      from: 'Solace Point Intake',
      to: INTERNAL_ALERT_RECIPIENT,
      subject: `[Quote #${quoteId}] New Portfolio Review: ${name}`,
      html: alertHtml
    });

    // C. Send elegant auto-reply receipt to client
    const receiptHtml = buildHtmlTemplate(
      'Quote Review Underway',
      'Portfolio Copy',
      `
        <p style="font-family: 'Montserrat', sans-serif; font-size: 22px; margin-top: 0; color: #1E3F62; font-weight: 800; letter-spacing: -0.01em;">Hello ${name},</p>
        <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 35px; font-weight: 400;">Thank you for choosing Solace Point. We have successfully compiled your portfolio specifications (Reference: <strong>#${quoteId}</strong>).</p>
        
        <div style="background-color: #f9fbfd; border: 1px solid #e1e7ee; border-top: 4px solid #DDB959; border-radius: 12px; padding: 35px 40px; margin: 35px 0; text-align: center;">
          <p style="margin: 0; font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 800; color: #1E3F62; letter-spacing: 0.02em;">Quote Calculation Initialized</p>
          <p style="margin: 12px 0 0 0; font-family: 'Montserrat', sans-serif; font-size: 14.5px; color: #43474e; line-height: 1.8; font-weight: 400;">Our risk architects are already compiling premium tables across our top-tier network to secure optimized coverage terms and the best rates. <strong>A licensed advisor will contact you personally at ${phone} to present your customized insurance portfolio shortly.</strong></p>
        </div>

        <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; margin-top: 45px; font-weight: 400;">
          *This is an automated confirmation receipt. Please do not reply directly to this email, as this address is unmonitored. For any immediate questions, feel free to contact us through our official channels.
        </p>
      `,
      false
    );

    await safeSendEmail({
      from: 'Solace Point',
      to: email,
      subject: 'Your Insurance Portfolio Review is Underway - Solace Point',
      html: receiptHtml
    });

    res.status(201).json({ success: true, message: 'Quote request compiled successfully.', quoteId });
  } catch (error) {
    console.error('❌ Error handling quote request:', error.message || error);
    res.status(500).json({ success: false, error: error.message || 'Database or server configuration issue.' });
  }
});

// -------------------------------------------------------------
// 3. ADVISORY CONSULTATION ROUTE
// -------------------------------------------------------------
app.post('/api/advisory', async (req, res) => {
  const { name, email, interest, details } = req.body;

  if (!name || !email || !interest || !details) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  try {
    verifyDatabase();

    // A. Insert into Supabase Database
    const { data, error } = await db.supabase
      .from('advisory_requests')
      .insert([{ name, email, area_of_interest: interest, details }])
      .select('id')
      .single();

    if (error) throw error;
    const advisoryId = data.id;
    console.log(`💾 Advisory request stored in Supabase. ID: ${advisoryId}`);

    // B. Send lead notification to your verified Gmail inbox
    const alertHtml = buildHtmlTemplate(
      'New Consultation Request',
      `Reference #${advisoryId}`,
      `
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Left Column: Context & Details -->
            <td style="width: 50%; vertical-align: top; padding-right: 40px;">
              <h3 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 18px; letter-spacing: -0.02em;">Consultation Overview</h3>
              <p style="font-family: 'Montserrat', sans-serif; font-size: 14.5px; color: #43474e; line-height: 1.8; margin-bottom: 28px; font-weight: 400;">A client has requested a personal strategic consultation with an advisor. They are seeking architectural non-life solutions to shield their assets.</p>
              
              <p style="margin: 0 0 10px 0; font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 800; color: #1E3F62; text-transform: uppercase; letter-spacing: 0.1em;">Consultation Goals:</p>
              <div style="background-color: #fbf9fa; border: 1px solid #dee3eb; padding: 25px; border-left: 4px solid #DDB959; font-style: italic; border-radius: 8px; line-height: 1.8; color: #2c3e50; font-size: 14.5px; font-family: 'Montserrat', sans-serif; font-weight: 400;">
                "${details.replace(/\n/g, '<br/>')}"
              </div>
              <p style="font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; color: #7f8c8d; line-height: 1.7; margin-top: 30px; margin-bottom: 0;">Please assign a specialist in our <strong>${interest}</strong> division and schedule a brief advisory call.</p>
            </td>
            
            <!-- Right Column: Structured Table Card -->
            <td style="width: 50%; vertical-align: top; padding-left: 40px; border-left: 1px solid #dee3eb;">
              <div style="border: 1px solid #eef2f6; border-radius: 16px; padding: 35px; background-color: #fbf9fa; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);">
                <h3 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 0; margin-bottom: 20px; border-bottom: 2px solid #dee3eb; padding-bottom: 12px; font-weight: 800;">Submission Details</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-family: 'Montserrat', sans-serif; font-size: 13.5px; color: #43474e;">
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; width: 40%; border-bottom: 1px solid #dee3eb;">Consultation ID:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #AF7F2A; font-weight: 800;">#${advisoryId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Client Name:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #1E3F62; font-weight: 600;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Email Address:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #1E3F62; font-weight: 500;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Area of Interest:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; text-transform: capitalize; color: #1E3F62; font-weight: 600;">${interest}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      `,
      true
    );

    await safeSendEmail({
      from: 'Solace Point Intake',
      to: INTERNAL_ALERT_RECIPIENT,
      subject: `[Advisory #${advisoryId}] Consultation Request: ${name}`,
      html: alertHtml
    });

    // C. Send elegant auto-reply receipt to client
    const receiptHtml = buildHtmlTemplate(
      'Consultation Scheduled',
      'Advisory Copy',
      `
        <p style="font-family: 'Montserrat', sans-serif; font-size: 22px; margin-top: 0; color: #1E3F62; font-weight: 800; letter-spacing: -0.01em;">Hello ${name},</p>
        <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 35px; font-weight: 400;">We have successfully scheduled your request to consult with a Solace Point risk advisor (Reference: <strong>#${advisoryId}</strong>).</p>
        
        <div style="background-color: #f9fbfd; border: 1px solid #e1e7ee; border-top: 4px solid #DDB959; border-radius: 12px; padding: 35px 40px; margin: 35px 0; text-align: center;">
          <p style="margin: 0; font-family: 'Montserrat', sans-serif; font-size: 18px; font-weight: 800; color: #1E3F62; letter-spacing: 0.02em;">Expert Advisory Assigned</p>
          <p style="margin: 12px 0 0 0; font-family: 'Montserrat', sans-serif; font-size: 14.5px; color: #43474e; line-height: 1.8; font-weight: 400;">A dedicated specialist in our <strong>${interest}</strong> division is currently reviewing your profile to assist with your architectural risk coverage. <strong>A representative will call you shortly to schedule your personal review session.</strong></p>
        </div>

        <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; margin-top: 45px; font-weight: 400;">
          *This is an automated confirmation receipt. Please do not reply directly to this email, as this address is unmonitored. For any immediate questions, feel free to contact us through our official channels.
        </p>
      `,
      false
    );

    await safeSendEmail({
      from: 'Solace Point',
      to: email,
      subject: 'Consultation Request Confirmed - Solace Point',
      html: receiptHtml
    });

    res.status(201).json({ success: true, message: 'Consultation logged successfully.', advisoryId });
  } catch (error) {
    console.error('❌ Error handling advisory consultation:', error.message || error);
    res.status(500).json({ success: false, error: error.message || 'Database or server configuration issue.' });
  }
});

// -------------------------------------------------------------
// 4. NEWSLETTER JOIN ENDPOINT
// -------------------------------------------------------------
app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }

  try {
    verifyDatabase();

    // A. Insert subscriber into Supabase Database
    const { data, error } = await db.supabase
      .from('newsletter_subscribers')
      .insert([{ email }])
      .select('id')
      .single();

    // Handle unique constraint violations gracefully
    if (error) {
      if (error.code === '23505') {
        return res.status(200).json({ success: true, message: 'You are already subscribed to the Circle!' });
      }
      throw error;
    }

    const subscriberId = data.id;
    console.log(`💾 Newsletter subscriber stored in Supabase. ID: ${subscriberId}`);

    // B. Send lead notification to your verified Gmail inbox
    const alertHtml = buildHtmlTemplate(
      'New Circle Subscriber',
      `Reference #${subscriberId}`,
      `
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- Left Column: Context -->
            <td style="width: 50%; vertical-align: top; padding-right: 40px;">
              <h3 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 18px; letter-spacing: -0.02em;">Circle Subscription</h3>
              <p style="font-family: 'Montserrat', sans-serif; font-size: 14.5px; color: #43474e; line-height: 1.8; margin-bottom: 28px; font-weight: 400;">A new reader has joined the Solace Point newsletter list to keep pace with modern asset preservation guidelines.</p>
              
              <div style="background-color: #fbf9fa; border: 1px dashed #DDB959; padding: 25px; border-radius: 12px; font-size: 14px; color: #43474e; line-height: 1.8; margin-top: 30px; font-family: 'Montserrat', sans-serif; font-weight: 400;">
                <strong>Welcome Protocol Complete:</strong> The subscriber is now configured to receive automated risk reports, non-life industry newsletters, and quarterly advisory briefs.
              </div>
            </td>
            
            <!-- Right Column: Structured Table Card -->
            <td style="width: 50%; vertical-align: top; padding-left: 40px; border-left: 1px solid #dee3eb;">
              <div style="border: 1px solid #eef2f6; border-radius: 16px; padding: 35px; background-color: #fbf9fa; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);">
                <h3 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 0; margin-bottom: 20px; border-bottom: 2px solid #dee3eb; padding-bottom: 12px; font-weight: 800;">Subscriber Details</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-family: 'Montserrat', sans-serif; font-size: 13.5px; color: #43474e;">
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; width: 45%; border-bottom: 1px solid #dee3eb;">Subscriber ID:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #AF7F2A; font-weight: 800;">#${subscriberId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Email Address:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; color: #1E3F62; font-weight: 500;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Status:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb;"><span style="background-color: #e6f4ea; color: #137333; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">Active</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 0; font-weight: 700; border-bottom: 1px solid #dee3eb;">Joined Date:</td>
                    <td style="padding: 14px 0; border-bottom: 1px solid #dee3eb; font-weight: 500;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      `,
      true
    );

    await safeSendEmail({
      from: 'Solace Point Circle',
      to: INTERNAL_ALERT_RECIPIENT,
      subject: `[Subscriber #${subscriberId}] New Newsletter Join: ${email}`,
      html: alertHtml
    });

    // C. Send welcome email to client
    const welcomeHtml = buildHtmlTemplate(
      'Welcome to the Circle',
      'Subscription Copy',
      `
        <h2 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-weight: 800; margin-top: 0; margin-bottom: 30px; font-size: 24px; text-align: center; letter-spacing: -0.01em;">You Are in the Circle</h2>
        <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 20px; font-weight: 400;">Hello,</p>
        <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 20px; font-weight: 400;">Thank you for subscribing to the Solace Point newsletter. By joining the Circle, you will receive curated insights on risk management, custom insurance architecture, and updates on protecting what matters most to your life, home, and business.</p>
        <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 35px; font-weight: 400;">We promise to respect your inbox, delivering only meaningful, highly expert guidance direct from our licensed risk architects.</p>
        
        <div style="background-color: #f9fbfd; border: 1px solid #e1e7ee; border-top: 4px solid #DDB959; border-radius: 12px; padding: 35px 40px; text-align: center; margin: 35px 0;">
          <p style="margin: 0; font-family: 'Montserrat', sans-serif; font-weight: 800; color: #1E3F62; font-size: 18px; letter-spacing: 0.02em;">Your Subscription is Fully Active</p>
          <p style="margin: 8px 0 0 0; font-family: 'Montserrat', sans-serif; font-size: 14.5px; color: #8d9199; font-weight: 400;">No further action is required on your part.</p>
        </div>

        <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; margin-top: 45px; text-align: center; font-weight: 400;">
          *This is an automated confirmation receipt. Please do not reply directly to this email, as this address is unmonitored. For any immediate assistance, feel free to contact us through our official channels.
        </p>
      `,
      false
    );

    await safeSendEmail({
      from: 'Solace Point',
      to: email,
      subject: 'Welcome to the Circle - Solace Point',
      html: welcomeHtml
    });

    res.status(201).json({ success: true, message: 'Subscribed to the Circle successfully.' });
  } catch (error) {
    console.error('❌ Error handling newsletter join:', error.message || error);
    res.status(500).json({ success: false, error: error.message || 'Database or server configuration issue.' });
  }
});

// Simple Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 SolacePoint Backend API running on port ${PORT}`);
});
