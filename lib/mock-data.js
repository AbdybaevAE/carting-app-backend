const faker = require("faker");
const GENERATED_USERS_COUNT = 50;
const generateUsers = (limit = GENERATED_USERS_COUNT) => {
	let count = 0;
	const users = [];
	while (count < limit) {
		const createdAt = faker.date.past();
		const user = {
			email: faker.internet.email(),
			username: faker.internet.userName(),
			time: 500 + (faker.random.number() % 10000),
			createdAt,
			updatedAt: createdAt,
		};
		if (~users.map((user) => user.email).indexOf(user.email)) continue;
		users.push(user);
		count++;
	}
	return users;
};
module.exports = { generateUsers };
