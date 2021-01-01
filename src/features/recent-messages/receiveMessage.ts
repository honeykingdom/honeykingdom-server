import { Client, MessageEvent } from 'twitch-simple-irc';

const receiveMessage = async (
  channels: string[],
  onMessage: (data: MessageEvent) => void,
) => {
  const client = new Client();

  await client.connect();

  channels.forEach((channel) => client.join(channel));

  client.on('message', onMessage);

  client.on('error', (error) => {
    console.error(error);
  });

  client.on('connect', () => {
    console.log('connect');
  });

  client.on('disconnect', () => {
    console.log('disconnect');
  });
};

export default receiveMessage;
