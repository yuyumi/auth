const nodemailer = require('nodemailer');

// Create Gmail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ADMIN_EMAIL,
        // Use app-specific password from Google Account settings
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

const sendManufacturerVerificationEmail = async (manufacturerEmail, manufacturerId) => {
    try {
        const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: process.env.ADMIN_EMAIL, // Send to admin
            subject: 'New Manufacturer Account Verification Required',
            html: `
                <h2>New Manufacturer Account Registration</h2>
                <p><strong>Manufacturer Email:</strong> ${manufacturerEmail}</p>
                <p><strong>Manufacturer ID:</strong> ${manufacturerId}</p>
                <p>Please verify this manufacturer account in the admin dashboard.</p>
                <p>Click the link below to approve or reject:</p>
                <a href="${process.env.FRONTEND_URL}/admin/verify/${manufacturerId}">
                    Verify Manufacturer
                </a>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
};

module.exports = {
    sendManufacturerVerificationEmail
};