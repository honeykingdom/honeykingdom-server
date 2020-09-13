import receiveMessage from './receiveMessage';
import db from '../database';

type RecentMessagesParams = {
  channels: string[];
  mongodbUri: string;
  messagesLimit: number;
};

const recentMessages = ({
  channels,
  mongodbUri,
  messagesLimit,
}: RecentMessagesParams) => {
  const main = async () => {
    await db.connect(mongodbUri);

    await receiveMessage(channels, (message) => {
      db.insertMessage(message);
    });
  };

  main().catch((error) => console.error(error));

  return async (req: any, res: any) => {
    const { channel } = req.params;

    const response = await db.getLastMessages(channel, messagesLimit);

    res.send(response);
  };
};

export default recentMessages;
