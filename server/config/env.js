import 'dotenv/config';

function required(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  return value.trim();
}

export const env = {
  PORT: Number(process.env.PORT || 5000),

  MONGODB_URI:
    required('MONGODB_URI'),

  OPENAI_API_KEY:
    required('OPENAI_API_KEY'),

  OPENAI_MODEL:
    process.env.OPENAI_MODEL?.trim() ||
    'gpt-5.5',

  CLIENT_ORIGIN:
    process.env.CLIENT_ORIGIN?.trim() ||
    'http://localhost:5173',
};