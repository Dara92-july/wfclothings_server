const { Resend } = require('resend');
const { RESEND_API_KEY, FROM_EMAIL, FROM_NAME, NODE_ENV } = require('../config/env');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
    if (!this.resend) {
      logger.warn('RESEND_API_KEY is not set. Emails will not be sent.');
    }
  }

  async sendEmail(options) {
    if (!this.resend) {
      logger.warn(`Email not sent (RESEND_API_KEY missing): ${options.subject}`);
      return null;
    }

    const message = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    try {
      const { data, error } = await this.resend.emails.send(message);

      if (error) {
        logger.error(`Email sending failed: ${error.message || JSON.stringify(error)}`);
        return null;
      }

      logger.info(`Email sent: ${data?.id || 'unknown'} to ${options.to}`);
      return data;
    } catch (error) {
      // Fail silently so a mail outage never breaks payment/order flows.
      logger.error(`Email sending failed: ${error.message}`);
      return null;
    }
  }

  async sendOrderConfirmation(order) {
    const customer = order.user || order.guestInfo;
    if (!customer) return;

    const html = `
      <h1>Order Confirmation - ${order.orderNumber}</h1>
      <p>Hi ${customer.name},</p>
      <p>Thank you for your order! We've received your payment and are preparing your items.</p>
      <h3>Order Details:</h3>
      <ul>
        ${order.items.map(item => `<li>${item.name} x ${item.quantity} - ₦${(item.price * item.quantity / 100).toFixed(2)}</li>`).join('')}
      </ul>
      <p><strong>Total:</strong> ₦${(order.pricing.total / 100).toFixed(2)}</p>
      <p>We'll notify you when your order ships.</p>
    `;

    await this.sendEmail({
      to: customer.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html
    });
  }

  async sendOrderStatusUpdate(order) {
    const customer = order.user || order.guestInfo;
    if (!customer) return;

    const html = `
      <h1>Order Update - ${order.orderNumber}</h1>
      <p>Hi ${customer.name},</p>
      <p>Your order status has been updated to: <strong>${order.status.toUpperCase()}</strong></p>
      ${order.tracking?.trackingNumber ? `<p>Tracking Number: ${order.tracking.trackingNumber}</p>` : ''}
    `;

    await this.sendEmail({
      to: customer.email,
      subject: `Order Update - ${order.orderNumber}`,
      html
    });
  }

  async sendPasswordReset(user, resetUrl) {
    const html = `
      <h1>Password Reset Request</h1>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="padding: 10px 20px; background: #0066FF; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link expires in 10 minutes.</p>
    `;

    await this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html
    });
  }
}

module.exports = new EmailService();
