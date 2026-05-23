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

// Beautiful premium HSL Hues Template Wrapper
function buildHtmlTemplate(title, subtitle, contentHtml, isAlert = false) {
  const accentColor = '#b38f4f'; // Premium Solace Gold
  const primaryColor = '#0c2340'; // Deep Navy Slate
  const bgColor = isAlert ? '#f3f4f6' : '#fcfbfa'; // Architectural light gray vs creamy museum white

  return `
    <div style="background-color: ${bgColor}; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748; line-height: 1.6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 12px 40px rgba(12, 35, 64, 0.04); border: 1px solid #edf2f7;">
        
        <!-- Header Banner -->
        <div style="background-color: ${primaryColor}; padding: 45px 30px; text-align: center; border-bottom: 3px solid ${accentColor};">
          <!-- Inline Logo Attachment referencing Content-ID (CID) -->
          <img src="cid:logo" alt="Solace Point Logo" style="height: 60px; object-fit: contain; margin-bottom: 20px;" />
          <div style="width: 35px; height: 1px; background-color: ${accentColor}; margin: 0 auto 15px auto;"></div>
          <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.35em; color: ${accentColor}; display: block; margin-bottom: 8px;">
            ${subtitle}
          </span>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.01em;">
            ${title}
          </h1>
        </div>

        <!-- Main Content Area -->
        <div style="padding: 40px 35px; background-color: #ffffff;">
          ${contentHtml}
        </div>

        <!-- Footer block -->
        <div style="background-color: #fafbfc; border-top: 1px solid #f0f2f5; padding: 35px 20px; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 0.2em;">
            SOLACE POINT
          </p>
          <p style="margin: 4px 0 0 0; font-size: 9px; color: ${accentColor}; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3em;">
            Insurance Agency
          </p>
          <p style="margin: 20px 0 0 0; font-size: 11px; color: #718096; line-height: 1.6;">
            Stability in Security. Clarity in Service.<br/>
            ${REPLY_TO_EMAIL} | (02) 8800 1234
          </p>
        </div>

      </div>
    </div>
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
        <p style="font-size: 15px; margin-top: 0; color: #4a5568;">A client has submitted a contact message on the SolacePoint web portal.</p>
        <div style="border: 1px solid #edf2f7; border-radius: 12px; padding: 25px; margin: 25px 0; background-color: #fafbfc;">
          <h3 style="color: #0c2340; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #edf2f7; padding-bottom: 10px;">Submission Details</h3>
          <p style="margin: 8px 0; font-size: 14px; color: #4a5568;"><strong>Lead Reference:</strong> <span style="color: #b38f4f; font-weight: bold;">#${leadId}</span></p>
          <p style="margin: 8px 0; font-size: 14px; color: #4a5568;"><strong>Client Name:</strong> ${name}</p>
          <p style="margin: 8px 0; font-size: 14px; color: #4a5568;"><strong>Email Address:</strong> ${email}</p>
          <p style="margin: 20px 0 5px 0; font-size: 14px; font-weight: bold; color: #0c2340;">Message Details:</p>
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-left: 4px solid #b38f4f; font-style: italic; border-radius: 6px; line-height: 1.6; color: #4a5568;">
            "${message.replace(/\n/g, '<br/>')}"
          </div>
        </div>
        <p style="font-size: 14px; color: #718096; margin-bottom: 0;">Please execute a follow-up call with the client inside the standard 24-hour response window.</p>
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
        <p style="font-size: 16px; margin-top: 0; color: #0c2340; font-weight: bold;">Hello ${name},</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7;">Thank you for contacting Solace Point Insurance Agency. We appreciate you taking the time to share your questions and protection needs with us.</p>
        
        <div style="background-color: #fcf9f2; border: 1px solid #f4e8cf; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; font-size: 15px; font-weight: bold; color: #0c2340;">Lead Compilation Successful</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #718096; line-height: 1.6;">Your message has been securely parsed into our lead registry. <strong>A licensed risk advisor will review your request and contact you personally via phone call within 24 hours.</strong></p>
        </div>

        <p style="font-size: 13px; color: #718096; font-style: italic; line-height: 1.6; margin-bottom: 0; border-top: 1px solid #f0f2f5; padding-top: 20px;">
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
        <p style="font-size: 15px; margin-top: 0; color: #4a5568;">A client has requested a custom insurance portfolio review.</p>
        
        <div style="border: 1px solid #edf2f7; border-radius: 12px; padding: 25px; margin: 25px 0; background-color: #fafbfc;">
          <h3 style="color: #0c2340; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #edf2f7; padding-bottom: 10px;">Submission Details</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #4a5568;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 40%; border-bottom: 1px solid #edf2f7;">Quote ID:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: #b38f4f; font-weight: bold;">#${quoteId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #edf2f7;">Client Name:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #edf2f7;">Email:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #edf2f7;">Phone Number:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #edf2f7;">Insurance Type:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; text-transform: capitalize;">${insuranceType} ${otherInsuranceType ? `(${otherInsuranceType})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #edf2f7;">Property Type:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; text-transform: capitalize;">${propertyType} ${otherPropertyType ? `(${otherPropertyType})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #edf2f7;">Estimated Amount:</td>
              <td style="padding: 8px 0; color: #b38f4f; font-weight: bold; border-bottom: 1px solid #edf2f7;">₱${parseFloat(estimatedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          
          <p style="margin: 20px 0 5px 0; font-size: 14px; font-weight: bold; color: #0c2340;">Additional Details:</p>
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-left: 4px solid #b38f4f; font-style: italic; border-radius: 6px; line-height: 1.6; color: #4a5568;">
            ${details ? details.replace(/\n/g, '<br/>') : 'None provided'}
          </div>
        </div>
        <p style="font-size: 14px; color: #718096; margin-bottom: 0;">Please compile provider rate comparisons and call the client immediately to deliver their quote.</p>
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
        <p style="font-size: 16px; margin-top: 0; color: #0c2340; font-weight: bold;">Hello ${name},</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7;">Thank you for choosing Solace Point. We have successfully compiled your portfolio specifications (Reference: <strong>#${quoteId}</strong>).</p>
        
        <div style="background-color: #fcf9f2; border: 1px solid #f4e8cf; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; font-size: 15px; font-weight: bold; color: #0c2340;">Quote Calculation Initialized</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #718096; line-height: 1.6;">Our risk architects are already compiling premium tables across our top-tier network to secure optimized coverage terms and the best rates. <strong>A licensed advisor will contact you personally at ${phone} to present your customized insurance portfolio shortly.</strong></p>
        </div>

        <p style="font-size: 13px; color: #718096; font-style: italic; line-height: 1.6; margin-bottom: 0; border-top: 1px solid #f0f2f5; padding-top: 20px;">
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
        <p style="font-size: 15px; margin-top: 0; color: #4a5568;">A client has requested a personal consultation with a risk advisor.</p>
        <div style="border: 1px solid #edf2f7; border-radius: 12px; padding: 25px; margin: 25px 0; background-color: #fafbfc;">
          <h3 style="color: #0c2340; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #edf2f7; padding-bottom: 10px;">Submission Details</h3>
          <p style="margin: 8px 0; font-size: 14px; color: #4a5568;"><strong>Consultation ID:</strong> <span style="color: #b38f4f; font-weight: bold;">#${advisoryId}</span></p>
          <p style="margin: 8px 0; font-size: 14px; color: #4a5568;"><strong>Client Name:</strong> ${name}</p>
          <p style="margin: 8px 0; font-size: 14px; color: #4a5568;"><strong>Email Address:</strong> ${email}</p>
          <p style="margin: 8px 0; font-size: 14px; color: #4a5568; text-transform: capitalize;"><strong>Area of Interest:</strong> ${interest}</p>
          <p style="margin: 20px 0 5px 0; font-size: 14px; font-weight: bold; color: #0c2340;">Consultation Details:</p>
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 15px; border-left: 4px solid #b38f4f; font-style: italic; border-radius: 6px; line-height: 1.6; color: #4a5568;">
            "${details.replace(/\n/g, '<br/>')}"
          </div>
        </div>
        <p style="font-size: 14px; color: #718096; margin-bottom: 0;">Please assign an expert licensed agent from the ${interest} division and schedule a call.</p>
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
        <p style="font-size: 16px; margin-top: 0; color: #0c2340; font-weight: bold;">Hello ${name},</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7;">We have successfully scheduled your request to consult with a Solace Point risk advisor (Reference: <strong>#${advisoryId}</strong>).</p>
        
        <div style="background-color: #fcf9f2; border: 1px solid #f4e8cf; border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; font-size: 15px; font-weight: bold; color: #0c2340;">Expert Advisory Assigned</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #718096; line-height: 1.6;">A dedicated specialist in our <strong>${interest}</strong> division is currently reviewing your profile to assist with your architectural risk coverage. <strong>A representative will call you shortly to schedule your personal review session.</strong></p>
        </div>

        <p style="font-size: 13px; color: #718096; font-style: italic; line-height: 1.6; margin-bottom: 0; border-top: 1px solid #f0f2f5; padding-top: 20px;">
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
        <p style="font-size: 15px; margin-top: 0; color: #4a5568;">A new reader has joined the SolacePoint newsletter list.</p>
        
        <div style="border: 1px solid #edf2f7; border-radius: 12px; padding: 25px; margin: 25px 0; background-color: #fafbfc;">
          <h3 style="color: #0c2340; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid #edf2f7; padding-bottom: 10px;">Subscriber Details</h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #4a5568;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 40%; border-bottom: 1px solid #edf2f7;">Subscriber ID:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: #b38f4f; font-weight: bold;">#${subscriberId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #edf2f7;">Email Address:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7; color: #0c2340; font-weight: 500;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #edf2f7;">Subscription Status:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7;"><span style="background-color: #e6f4ea; color: #137333; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase;">Active</span></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #edf2f7;">Subscription Date:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #edf2f7;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #718096; margin-bottom: 0;">They are now configured to receive automated insights and quarterly briefs.</p>
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
        <h2 style="color: #0c2340; font-weight: bold; margin-top: 0; margin-bottom: 20px; font-size: 20px; text-align: center;">You Are in the Circle</h2>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7;">Hello,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7;">Thank you for subscribing to the Solace Point newsletter. By joining the Circle, you will receive curated insights on risk management, custom insurance architecture, and updates on protecting what matters most to your life, home, and business.</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7;">We promise to respect your inbox, delivering only meaningful, highly expert guidance direct from our licensed risk architects.</p>
        
        <div style="background-color: #fcf9f2; border: 1px dashed #b38f4f; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0;">
          <p style="margin: 0; font-weight: bold; color: #0c2340; font-size: 15px;">Your Subscription is Fully Active</p>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #718096;">No further action is required on your part.</p>
        </div>

        <p style="font-size: 13px; color: #718096; font-style: italic; line-height: 1.6; margin-bottom: 0; border-top: 1px solid #f0f2f5; padding-top: 20px; text-align: center;">
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
