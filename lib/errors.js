const { MoleculerClientError } = require("moleculer").Errors;

module.exports = {
	invalidBody: new MoleculerClientError("Invalid body", 403, "InvalidBody"),
	emailExist: new MoleculerClientError(
		"Given email already exist",
		422,
		"EmailAlreadyExist"
	),
	notFound: new MoleculerClientError("Resource not found", 404, "NotFound"),
	serverInternalError: new MoleculerClientError(
		"Server internal error",
		503,
		"ServerInternal"
	),
	envError: new Error("Check environments variable"),
};
