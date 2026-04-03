import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendNewApplicationNotification(
  application: {
    id: string; name: string; type: string; scope: string;
    budget?: number; dateRange?: string; classGroup?: string;
  }
): Promise<void> {
  const dashboardUrl = `${process.env.APP_URL || 'http://localhost:3000'}/vorstand/antrag/${application.id}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: 'pro@mmbbs.de',
    subject: `Neuer Förderantrag: ${application.type}`,
    html: `
      <h2>Neuer Förderantrag eingegangen</h2>
      <table style="border-collapse:collapse">
        <tr><td><strong>Antragsteller:</strong></td><td>${application.name}</td></tr>
        <tr><td><strong>Art der Unterstützung:</strong></td><td>${application.type}</td></tr>
        <tr><td><strong>Umfang:</strong></td><td>${application.scope}</td></tr>
        ${application.budget ? `<tr><td><strong>Budget:</strong></td><td>${application.budget} €</td></tr>` : ''}
        ${application.dateRange ? `<tr><td><strong>Zeitraum:</strong></td><td>${application.dateRange}</td></tr>` : ''}
        ${application.classGroup ? `<tr><td><strong>Klasse/Gruppe:</strong></td><td>${application.classGroup}</td></tr>` : ''}
      </table>
      <p><a href="${dashboardUrl}">Antrag im Dashboard öffnen und abstimmen</a></p>
    `,
  });
}

export async function sendApplicationConfirmation(
  applicantEmail: string,
  application: {
    id: string; name: string; type: string; scope: string;
    budget?: number; dateRange?: string; classGroup?: string;
  }
): Promise<void> {
  const statusUrl = `${process.env.APP_URL || 'http://localhost:3000'}/antrag-status/${application.id}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: applicantEmail,
    subject: `Ihr Förderantrag wurde eingereicht`,
    html: `
      <h2>Vielen Dank, ${application.name}!</h2>
      <p>Ihr Förderantrag ist bei uns eingegangen und wird vom Vorstand geprüft.</p>
      <h3>Ihre Antragsdetails</h3>
      <table style="border-collapse:collapse">
        <tr><td><strong>Antrags-ID:</strong></td><td><code>${application.id}</code></td></tr>
        <tr><td><strong>Art der Unterstützung:</strong></td><td>${application.type}</td></tr>
        <tr><td><strong>Umfang:</strong></td><td>${application.scope}</td></tr>
        ${application.budget != null ? `<tr><td><strong>Budget:</strong></td><td>${application.budget} €</td></tr>` : ''}
        ${application.dateRange ? `<tr><td><strong>Zeitraum:</strong></td><td>${application.dateRange}</td></tr>` : ''}
        ${application.classGroup ? `<tr><td><strong>Klasse/Gruppe:</strong></td><td>${application.classGroup}</td></tr>` : ''}
      </table>
      <p>Den aktuellen Status Ihres Antrags können Sie jederzeit hier einsehen:<br>
      <a href="${statusUrl}">${statusUrl}</a></p>
      <p>Mit freundlichen Grüßen<br>Der Vorstand des Pro MMBbS Fördervereins e.V.</p>
    `,
  });
}

export async function sendDecisionNotification(
  applicantEmail: string,
  applicantName: string,
  type: string,
  approved: boolean,
  tiebreakerApplied = false
): Promise<void> {
  const tiebreakerNote = tiebreakerApplied
    ? `<p style="font-size:0.9em;color:#666;font-style:italic;">
        Hinweis: Die Abstimmung endete 2:2. Gemäß Satzung hat die Stimme des
        1. Vorsitzenden in diesem Fall doppeltes Gewicht und war damit entscheidend.
       </p>`
    : '';

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: applicantEmail,
    subject: approved
      ? `Ihr Förderantrag wurde bewilligt`
      : `Ihr Förderantrag wurde abgelehnt`,
    html: approved
      ? `
        <h2>Herzlichen Glückwunsch, ${applicantName}!</h2>
        <p>Ihr Förderantrag <strong>"${type}"</strong> wurde vom Vorstand bewilligt.</p>
        ${tiebreakerNote}
        <p>Wir freuen uns, Ihr Vorhaben unterstützen zu können. 
        Bitte nehmen Sie für die weiteren Schritte Kontakt mit uns auf.</p>
        <p>Mit freundlichen Grüßen<br>Der Vorstand des Pro MMBbS Fördervereins e.V.</p>
      `
      : `
        <h2>Sehr geehrte/r ${applicantName},</h2>
        <p>wir bedauern Ihnen mitteilen zu müssen, dass Ihr Förderantrag 
        <strong>"${type}"</strong> leider nicht bewilligt werden konnte.</p>
        ${tiebreakerNote}
        <p>Bei Fragen wenden Sie sich bitte an den Vorstand.</p>
        <p>Mit freundlichen Grüßen<br>Der Vorstand des Pro MMBbS Fördervereins e.V.</p>
      `,
  });
}
