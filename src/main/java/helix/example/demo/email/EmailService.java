package helix.example.demo.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.name}")
    private String appName;

    @Value("${app.email.notifications.enabled:true}")
    private boolean notificationsEnabled;

    @Async
    public void sendExpenseNotification(
            List<String> toEmails,
            String groupName,
            String expenseTitle,
            double totalAmount,
            String paidByName) {

        if (!notificationsEnabled) {
            log.info("Email notifications disabled, skipping expense notification");
            return;
        }

        for (String email : toEmails) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setFrom(fromEmail);
                helper.setTo(email);
                helper.setSubject("💸 New expense added in " + groupName);
                helper.setText(buildExpenseEmailHtml(
                        groupName, expenseTitle, totalAmount, paidByName), true);

                mailSender.send(message);
                log.info("Expense notification sent to {}", email);
            } catch (Exception e) {
                log.error("Failed to send email to {}: {}", email, e.getMessage());
            }
        }
    }

    @Async
    public void sendSettlementNotification(
            String toEmail,
            String settledByName,
            String groupName,
            double amount) {

        if (!notificationsEnabled) {
            log.info("Email notifications disabled, skipping settlement notification");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("✅ Payment settled in " + groupName);
            helper.setText(buildSettlementEmailHtml(
                    settledByName, groupName, amount), true);

            mailSender.send(message);
            log.info("Settlement notification sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send settlement email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildExpenseEmailHtml(
            String groupName, String expenseTitle,
            double totalAmount, String paidByName) {

        return """
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                        border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                            padding: 32px 24px; text-align: center;">
                    <div style="font-size: 36px;">💸</div>
                    <h1 style="color: white; margin: 8px 0 0; font-size: 22px;">%s</h1>
                </div>

                <!-- Body -->
                <div style="background: #ffffff; padding: 32px 24px;">
                    <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                        A new expense was added in <strong>%s</strong>
                    </p>

                    <!-- Expense Card -->
                    <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">EXPENSE</p>
                        <p style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: bold;">%s</p>
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <p style="margin: 0; color: #6b7280; font-size: 12px;">AMOUNT</p>
                                <p style="margin: 4px 0 0; color: #667eea; font-size: 22px; font-weight: bold;">₹%.2f</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="margin: 0; color: #6b7280; font-size: 12px;">PAID BY</p>
                                <p style="margin: 4px 0 0; color: #111827; font-size: 16px; font-weight: bold;">%s</p>
                            </div>
                        </div>
                    </div>

                    <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 0;">
                        Log in to <strong>%s</strong> to view your share and settle up.
                    </p>
                </div>

                <!-- Footer -->
                <div style="background: #f9fafb; padding: 16px 24px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        You received this because you're a member of <strong>%s</strong>
                    </p>
                </div>
            </div>
            """.formatted(appName, groupName, expenseTitle, totalAmount, paidByName, appName, groupName);
    }

    private String buildSettlementEmailHtml(
            String settledByName, String groupName, double amount) {

        return """
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;
                        border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">

                <!-- Header -->
                <div style="background: linear-gradient(135deg, #43e97b 0%%, #38f9d7 100%%);
                            padding: 32px 24px; text-align: center;">
                    <div style="font-size: 36px;">✅</div>
                    <h1 style="color: white; margin: 8px 0 0; font-size: 22px;">Payment Settled!</h1>
                </div>

                <!-- Body -->
                <div style="background: #ffffff; padding: 32px 24px;">
                    <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                        <strong>%s</strong> has settled a payment in <strong>%s</strong>
                    </p>

                    <!-- Amount Card -->
                    <div style="background: #f0fdf4; border-radius: 12px; padding: 20px;
                                text-align: center; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">AMOUNT SETTLED</p>
                        <p style="margin: 0; color: #16a34a; font-size: 32px; font-weight: bold;">₹%.2f</p>
                    </div>

                    <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 0;">
                        Log in to <strong>%s</strong> to view updated balances.
                    </p>
                </div>

                <!-- Footer -->
                <div style="background: #f9fafb; padding: 16px 24px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        You received this because you're a member of <strong>%s</strong>
                    </p>
                </div>
            </div>
            """.formatted(settledByName, groupName, amount, appName, groupName);
    }
}