import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  raw: String,
  channel: String,
  message: String,
  user: String,
  timestamp: Number,
});

type DbMessage = {
  raw: String;
  channel: String;
  message: String;
  user: String;
};

const Message = mongoose.model('Message', MessageSchema);

const connect = async (url: string) =>
  await mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

const insertMessage = async ({ raw, channel, message, user }: DbMessage) => {
  const receivedMessage = new Message({
    raw,
    channel,
    message,
    user,
    timestamp: Date.now(),
  });

  await receivedMessage.save();
};

const getLastMessages = async (channel: string, limit: number) => {
  const messages = await Message.find({ channel })
    .limit(limit)
    .sort({ timestamp: 'desc' })
    .exec();

  return {
    messages: messages.map((message) => (message as any).raw).reverse(),
  };
};

const db = {
  connect,
  insertMessage,
  getLastMessages,
};

export default db;
