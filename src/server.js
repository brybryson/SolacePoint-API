const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
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

// Initialize Resend email client
let resendClient;
const resendApiKey = process.env.RESEND_API_KEY;

if (resendApiKey) {
  resendClient = new Resend(resendApiKey);
  console.log('📬 Resend Email Client initialized successfully.');
} else {
  console.warn('⚠️ WARNING: RESEND_API_KEY is missing in .env. Email notifications will be skipped.');
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
                        <img src="https://solacepoint.vercel.app/SolacePointLogo.png" alt="Solace Point Logo" style="height: 85px; object-fit: contain; display: block;" />
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
                  <span class="font-montserrat" style="font-size: 16px; font-weight: 800; color: ${primaryColor}; display: inline-block; vertical-align: middle;">Solace Point Insurance Agency</span>
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

// Helper to send emails defensively via Resend
async function safeSendEmail(emailPayload) {
  if (!resendClient) {
    console.log('✉️ Email send skipped (No valid Resend API key configured):', emailPayload.subject);
    return null;
  }

  try {
    const { data, error } = await resendClient.emails.send({
      from: `${emailPayload.from} <onboarding@resend.dev>`,
      to: [emailPayload.to],
      subject: emailPayload.subject,
      html: emailPayload.html,
      reply_to: REPLY_TO_EMAIL
    });

    if (error) {
      console.error('❌ Failed to send email via Resend:', emailPayload.subject, error.message);
      return null;
    }

    console.log('✉️ Email sent successfully:', emailPayload.subject, 'ID:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Failed to send email via Resend:', emailPayload.subject, error.message);
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
        <div style="text-align: center; max-width: 650px; margin: 0 auto; padding: 20px 0;">
          <h2 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-weight: 800; font-size: 26px; margin-top: 0; margin-bottom: 15px; letter-spacing: -0.02em;">New Contact Lead</h2>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #DDB959; letter-spacing: 0.2em; margin-bottom: 30px;">Reference #${leadId}</p>
          
          <hr style="border: 0; border-top: 2px solid #DDB959; width: 50px; margin: 0 auto 35px auto;" />
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 30px; font-weight: 400; text-align: left;">A client has submitted an inquiry. The lead specifications are compiled below:</p>
          
          <table style="width: 100%; border-collapse: collapse; font-family: 'Montserrat', sans-serif; font-size: 13.5px; color: #43474e; margin-bottom: 35px;">
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left; width: 35%;">Lead ID:</td>
              <td style="padding: 14px 10px; text-align: right; color: #AF7F2A; font-weight: 800;">#${leadId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Client Name:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 600;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Email Address:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 500;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Source Portal:</td>
              <td style="padding: 14px 10px; text-align: right; font-weight: 500;">Web Form (/contact)</td>
            </tr>
          </table>
          
          <p style="margin: 0 0 10px 0; font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 800; color: #1E3F62; text-transform: uppercase; letter-spacing: 0.1em; text-align: left;">Client Message:</p>
          <div style="background-color: #f5f3f4; padding: 25px; border-radius: 8px; line-height: 1.8; color: #43474e; font-size: 14.5px; font-family: 'Montserrat', sans-serif; font-weight: 400; text-align: left; margin-bottom: 35px;">
            "${message.replace(/\n/g, '<br/>')}"
          </div>
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; text-align: center; font-weight: 500;">
            *Please execute a professional follow-up call within the standard 24-hour response window.
          </p>
        </div>
      `,
      true
    );

    safeSendEmail({
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
        <div style="text-align: center; max-width: 650px; margin: 0 auto; padding: 20px 0;">
          <h2 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-weight: 800; font-size: 26px; margin-top: 0; margin-bottom: 15px; letter-spacing: -0.02em;">Message Received</h2>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #DDB959; letter-spacing: 0.2em; margin-bottom: 30px;">Confirmation Copy</p>
          
          <hr style="border: 0; border-top: 2px solid #DDB959; width: 50px; margin: 0 auto 35px auto;" />
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 25px; font-weight: 400; text-align: left;">Hello ${name},</p>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 25px; font-weight: 400; text-align: left;">Thank you for contacting Solace Point Insurance Agency. We appreciate you taking the time to share your questions and protection needs with us.</p>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 45px; font-weight: 400; text-align: left;">Your message has been securely parsed into our lead registry (Reference: <strong>#${leadId}</strong>). A licensed risk advisor will review your request and contact you personally via phone call within 24 hours.</p>
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; text-align: center; font-weight: 400;">
            *This is an automated confirmation receipt. Please do not reply directly to this email. For any immediate assistance, feel free to contact us through our official channels.
          </p>
        </div>
      `,
      false
    );

    safeSendEmail({
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
        <div style="text-align: center; max-width: 650px; margin: 0 auto; padding: 20px 0;">
          <h2 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-weight: 800; font-size: 26px; margin-top: 0; margin-bottom: 15px; letter-spacing: -0.02em;">New Quote Request</h2>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #DDB959; letter-spacing: 0.2em; margin-bottom: 30px;">Reference #${quoteId}</p>
          
          <hr style="border: 0; border-top: 2px solid #DDB959; width: 50px; margin: 0 auto 35px auto;" />
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 30px; font-weight: 400; text-align: left;">A client has requested a custom non-life insurance portfolio review. The lead specifications are compiled below:</p>
          
          <table style="width: 100%; border-collapse: collapse; font-family: 'Montserrat', sans-serif; font-size: 13.5px; color: #43474e; margin-bottom: 35px;">
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left; width: 35%;">Quote ID:</td>
              <td style="padding: 14px 10px; text-align: right; color: #AF7F2A; font-weight: 800;">#${quoteId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Client Name:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 600;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Email Address:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 500;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Phone Number:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 500;">${phone}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Insurance Type:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 500; text-transform: capitalize;">${insuranceType} ${otherInsuranceType ? `(${otherInsuranceType})` : ''}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Property Type:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 500; text-transform: capitalize;">${propertyType} ${otherPropertyType ? `(${otherPropertyType})` : ''}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Estimated Amount:</td>
              <td style="padding: 14px 10px; text-align: right; color: #AF7F2A; font-weight: 800;">₱${parseFloat(estimatedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>
          
          <p style="margin: 0 0 10px 0; font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 800; color: #1E3F62; text-transform: uppercase; letter-spacing: 0.1em; text-align: left;">Coverage Specifications:</p>
          <div style="background-color: #f5f3f4; padding: 25px; border-radius: 8px; line-height: 1.8; color: #43474e; font-size: 14.5px; font-family: 'Montserrat', sans-serif; font-weight: 400; text-align: left; margin-bottom: 35px;">
            "${details ? details.replace(/\n/g, '<br/>') : 'None provided'}"
          </div>
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; text-align: center; font-weight: 500;">
            *Please compile rate proposals and contact the client immediately to deliver their portfolio review.
          </p>
        </div>
      `,
      true
    );

    safeSendEmail({
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
        <div style="text-align: center; max-width: 650px; margin: 0 auto; padding: 20px 0;">
          <h2 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-weight: 800; font-size: 26px; margin-top: 0; margin-bottom: 15px; letter-spacing: -0.02em;">Quote Review Underway</h2>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #DDB959; letter-spacing: 0.2em; margin-bottom: 30px;">Portfolio Copy</p>
          
          <hr style="border: 0; border-top: 2px solid #DDB959; width: 50px; margin: 0 auto 35px auto;" />
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 25px; font-weight: 400; text-align: left;">Hello ${name},</p>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 25px; font-weight: 400; text-align: left;">Thank you for choosing Solace Point. We have successfully compiled your portfolio specifications (Reference: <strong>#${quoteId}</strong>).</p>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 45px; font-weight: 400; text-align: left;">Our risk architects are already compiling premium tables across our network to secure optimized coverage terms and the best rates. A licensed advisor will contact you personally at <strong>${phone}</strong> to present your customized portfolio shortly.</p>
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; text-align: center; font-weight: 400;">
            *This is an automated confirmation receipt. Please do not reply directly to this email. For any immediate questions, feel free to contact us through our official channels.
          </p>
        </div>
      `,
      false
    );

    safeSendEmail({
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
        <div style="text-align: center; max-width: 650px; margin: 0 auto; padding: 20px 0;">
          <h2 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-weight: 800; font-size: 26px; margin-top: 0; margin-bottom: 15px; letter-spacing: -0.02em;">New Consultation Request</h2>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #DDB959; letter-spacing: 0.2em; margin-bottom: 30px;">Reference #${advisoryId}</p>
          
          <hr style="border: 0; border-top: 2px solid #DDB959; width: 50px; margin: 0 auto 35px auto;" />
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 30px; font-weight: 400; text-align: left;">A client has requested a personal strategic consultation with an advisor. The lead specifications are compiled below:</p>
          
          <table style="width: 100%; border-collapse: collapse; font-family: 'Montserrat', sans-serif; font-size: 13.5px; color: #43474e; margin-bottom: 35px;">
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left; width: 35%;">Consultation ID:</td>
              <td style="padding: 14px 10px; text-align: right; color: #AF7F2A; font-weight: 800;">#${advisoryId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Client Name:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 600;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Email Address:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 500;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Area of Interest:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 600; text-transform: capitalize;">${interest}</td>
            </tr>
          </table>
          
          <p style="margin: 0 0 10px 0; font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 800; color: #1E3F62; text-transform: uppercase; letter-spacing: 0.1em; text-align: left;">Consultation Goals:</p>
          <div style="background-color: #f5f3f4; padding: 25px; border-radius: 8px; line-height: 1.8; color: #43474e; font-size: 14.5px; font-family: 'Montserrat', sans-serif; font-weight: 400; text-align: left; margin-bottom: 35px;">
            "${details.replace(/\n/g, '<br/>')}"
          </div>
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; text-align: center; font-weight: 500;">
            *Please assign a specialist in our ${interest} division and schedule a brief advisory call.
          </p>
        </div>
      `,
      true
    );

    safeSendEmail({
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
        <div style="text-align: center; max-width: 650px; margin: 0 auto; padding: 20px 0;">
          <h2 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-weight: 800; font-size: 26px; margin-top: 0; margin-bottom: 15px; letter-spacing: -0.02em;">Consultation Scheduled</h2>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #DDB959; letter-spacing: 0.2em; margin-bottom: 30px;">Advisory Copy</p>
          
          <hr style="border: 0; border-top: 2px solid #DDB959; width: 50px; margin: 0 auto 35px auto;" />
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 25px; font-weight: 400; text-align: left;">Hello ${name},</p>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 25px; font-weight: 400; text-align: left;">We have successfully scheduled your request to consult with a Solace Point risk advisor (Reference: <strong>#${advisoryId}</strong>).</p>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 45px; font-weight: 400; text-align: left;">A dedicated specialist in our <strong>${interest}</strong> division is currently reviewing your profile to assist with your architectural coverage. A representative will call you shortly to schedule your personal review session.</p>
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; text-align: center; font-weight: 400;">
            *This is an automated confirmation receipt. Please do not reply directly to this email. For any immediate questions, feel free to contact us through our official channels.
          </p>
        </div>
      `,
      false
    );

    safeSendEmail({
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
        <div style="text-align: center; max-width: 650px; margin: 0 auto; padding: 20px 0;">
          <h2 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-weight: 800; font-size: 26px; margin-top: 0; margin-bottom: 15px; letter-spacing: -0.02em;">New Circle Subscriber</h2>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #DDB959; letter-spacing: 0.2em; margin-bottom: 30px;">Reference #${subscriberId}</p>
          
          <hr style="border: 0; border-top: 2px solid #DDB959; width: 50px; margin: 0 auto 35px auto;" />
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 30px; font-weight: 400; text-align: left;">A new reader has joined the Solace Point newsletter list. The subscriber specifications are compiled below:</p>
          
          <table style="width: 100%; border-collapse: collapse; font-family: 'Montserrat', sans-serif; font-size: 13.5px; color: #43474e; margin-bottom: 35px;">
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left; width: 35%;">Subscriber ID:</td>
              <td style="padding: 14px 10px; text-align: right; color: #AF7F2A; font-weight: 800;">#${subscriberId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Email Address:</td>
              <td style="padding: 14px 10px; text-align: right; color: #1E3F62; font-weight: 500;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Status:</td>
              <td style="padding: 14px 10px; text-align: right; color: #137333; font-weight: 700; font-size: 13.5px;">Active</td>
            </tr>
            <tr style="border-bottom: 1px solid #eef2f6;">
              <td style="padding: 14px 10px; font-weight: 700; text-align: left;">Joined Date:</td>
              <td style="padding: 14px 10px; text-align: right; font-weight: 500;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
          </table>
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; text-align: center; font-weight: 500;">
            *This subscriber is now active and will receive curated risk reports, newsletters, and advisory briefs. Registry synchronized with Supabase.
          </p>
        </div>
      `,
      true
    );

    safeSendEmail({
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
        <div style="text-align: center; max-width: 650px; margin: 0 auto; padding: 20px 0;">
          <h2 style="font-family: 'Montserrat', sans-serif; color: #1E3F62; font-weight: 800; font-size: 26px; margin-top: 0; margin-bottom: 15px; letter-spacing: -0.02em;">Welcome to the Circle</h2>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #DDB959; letter-spacing: 0.2em; margin-bottom: 30px;">Subscription Confirmed</p>
          
          <hr style="border: 0; border-top: 2px solid #DDB959; width: 50px; margin: 0 auto 35px auto;" />
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 25px; font-weight: 400; text-align: left;">Hello,</p>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 25px; font-weight: 400; text-align: left;">Thank you for subscribing to the Solace Point newsletter. By joining the Circle, you will receive curated insights on risk management, custom insurance architecture, and updates on protecting what matters most to your life, home, and business.</p>
          <p style="font-family: 'Montserrat', sans-serif; font-size: 15px; color: #43474e; line-height: 1.8; margin-bottom: 45px; font-weight: 400; text-align: left;">We promise to respect your inbox, delivering only meaningful, highly expert guidance direct from our licensed risk architects.</p>
          
          <p style="font-family: 'Montserrat', sans-serif; font-size: 12px; color: #7f8c8d; line-height: 1.8; margin-bottom: 0; border-top: 1px solid #dee3eb; padding-top: 25px; text-align: center; font-weight: 400;">
            *This is an automated confirmation receipt. Please do not reply directly to this email. For any immediate assistance, feel free to contact us through our official channels.
          </p>
        </div>
      `,
      false
    );

    safeSendEmail({
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
