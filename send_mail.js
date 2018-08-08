const nodemailer = require("nodemailer");
const appconst = require("./config/config").smtp_credentials;

module.exports = {
  mailit
};

/**
 *
 * @param {*array of email} emails
 * @param {*subject,*text,*body} payload
 */
function mailit(emails, payload) {
  return new Promise((resolve, reject) => {
    nodemailer.createTestAccount((err, account) => {
      if (err) {
        return reject(err);
      }
      // create reusable transporter object using the default SMTP transport
      let transporter = nodemailer.createTransport({
        host: appconst.smtp_host,
        port: appconst.port,
        secure: true, // true for 465, false for other ports
        auth: {
          user: appconst.user, // generated ethereal user
          pass: appconst.pass // generated ethereal password
        }
      });

      // setup email data with unicode symbols
      let mailOptions = {
        textEncoding: "quoted-printable",
        headers: {
          "Content-Transfer-Encoding": "quoted-printable"
        },
        from: appconst.from_data, // sender address
        to: emails.join(), // list of receivers
        subject: payload.subject, // Subject line
        text: payload.text, // plain text body
        html: payload.body // html body
      };

      // send mail with defined transport object
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          //console.log(error);
          return reject(error);
        }
        //console.log("Message sent: %s", info.messageId);
        // Preview only available when sending through an Ethereal account
        //console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        // return resolve({
        //   info: info.messageId,
        //   preview_url: nodemailer.getTestMessageUrl(info)
        // });
      });
      return resolve();
    });
  });
}
