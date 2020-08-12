const SuccessResponse = (statusCode = 200, message = "Successs") => ({
	statusCode,
	message,
	isSuccess: true,
});
const CreatedResponse = (statusCode = 201, message = "Created") =>
	SuccessResponse(statusCode, message);
module.exports = { SuccessResponse, CreatedResponse };
