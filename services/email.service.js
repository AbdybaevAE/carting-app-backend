const pug = require("pug");
const path = require("path");
const sgMail = require("@sendgrid/mail");
const { env } = require("../lib/config");
sgMail.setApiKey(env.sendGridApiKey);
const redis = require("redis");
const { EMAIL_CHANNEL } = require("../lib/constants");
const { isNil } = require("lodash");
module.exports = {
	name: "email",

	actions: {
		sendEmail: {
			handler(ctx) {
				this.sendEmail(ctx.params);
			},
		},
	},
	methods: {
		async sendEmail(message) {
			try {
				const [newWinnerStr, oldWinnerStr] = message.split("|");
				const oldWinner = JSON.parse(oldWinnerStr);
				const newWinner = JSON.parse(newWinnerStr);
				if (
					isNil(newWinner) ||
					isNil(oldWinner) ||
					newWinner.time === 0 ||
					newWinner.time === oldWinner.time
				)
					return;
				const compiledFunction = pug.compileFile(
					path.resolve(__dirname, "../templates/email.pug")
				);
				const html = compiledFunction({ oldWinner, newWinner });
				const receiver = oldWinner.email;
				console.log("Ignore receiver email", receiver);
				const to = env.testEmail;
				const msg = {
					to,
					from: "no-reply@cifer.kz",
					subject: "Update results!",
					html,
				};
				await sgMail.send(msg);
			} catch (e) {
				console.error(e);
			}
		},
	},
	async created() {
		const client = redis.createClient(env.redisPort, env.redisHost);
		client.subscribe(EMAIL_CHANNEL);
		client.on("message", (channel, message) => {
			switch (channel) {
				case EMAIL_CHANNEL:
					this.sendEmail(message);
					break;
				default:
					break;
			}
		});
	},
};
