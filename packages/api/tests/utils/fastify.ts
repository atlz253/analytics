export default {
  errors: {
    bodyMustBeObject: {
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: "body must be object",
      statusCode: 400,
    },
    bodyMustHaveRequiredProperty: (property: string) => ({
      statusCode: 400,
      code: "FST_ERR_VALIDATION",
      error: "Bad Request",
      message: `body must have required property '${property}'`,
    }),
  },
} as const;
