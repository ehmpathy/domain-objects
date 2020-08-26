import uuid from 'uuid';
import Joi from 'joi';

import { DomainObject } from './DomainObject';
import { JoiValidationError } from './validate/JoiValidationError';

describe('DomainObject', () => {
  describe('domain modeling use cases', () => {
    it('should be able to represent a value object', () => {
      interface ChatMessage {
        userUuid: string;
        conversationUuid: string;
        message: string;
      }
      class ChatMessage extends DomainObject<ChatMessage> implements ChatMessage {}
      const message = new ChatMessage({
        userUuid: uuid(),
        conversationUuid: uuid(),
        message: 'Hello, World!',
      });
      expect(message).toBeInstanceOf(ChatMessage); // sanity check
    });
    it('should be able to represent an entity', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      class RocketShip extends DomainObject<RocketShip> implements RocketShip {}
      const ship = new RocketShip({
        serialNumber: uuid(),
        fuelQuantity: 9001,
        passengers: 21,
      });
      expect(ship).toBeInstanceOf(RocketShip); // sanity check
    });
  });

  describe('instantiation', () => {
    interface ChatMessage {
      userUuid: string;
      conversationUuid: string;
      message: string;
    }
    class ChatMessage extends DomainObject<ChatMessage> implements ChatMessage {}
    it('should assign all properties in the constructor to the instance', () => {
      const message = new ChatMessage({
        userUuid: '__USER_UUID__',
        conversationUuid: '__CONVO_UUID__',
        message: 'Hello, World!',
      });
      expect(message.userUuid).toEqual('__USER_UUID__');
      expect(message.conversationUuid).toEqual('__CONVO_UUID__');
      expect(message.message).toEqual('Hello, World!');
    });
    it('should be able to spread into itself', () => {
      const message = new ChatMessage({
        userUuid: '__USER_UUID__',
        conversationUuid: '__CONVO_UUID__',
        message: 'Hello, World!',
      });
      const updatedMessage = new ChatMessage({ ...message, message: `Hello, World!\n Edit: You're great!` });
      expect(updatedMessage.userUuid).toEqual('__USER_UUID__');
      expect(updatedMessage.conversationUuid).toEqual('__CONVO_UUID__');
      expect(updatedMessage.message).toEqual(`Hello, World!\n Edit: You're great!`);
    });
  });

  describe('validation', () => {
    describe('Joi schema', () => {
      interface RocketShip {
        serialNumber: string;
        fuelQuantity: number;
        passengers: number;
      }
      const schema = Joi.object().keys({
        serialNumber: Joi.string().uuid().required(),
        fuelQuantity: Joi.number().required(),
        passengers: Joi.number().max(42).required(),
      });
      class RocketShip extends DomainObject<RocketShip> implements RocketShip {
        public static schema = schema;
      }
      it('should not throw error if when valid', () => {
        const ship = new RocketShip({
          serialNumber: uuid(),
          fuelQuantity: 9001,
          passengers: 21,
        });
        expect(ship).toBeInstanceOf(RocketShip); // sanity check
      });
      it('should throw a helpful error when does not pass joi schema', () => {
        try {
          // eslint-disable-next-line no-new
          new RocketShip({
            serialNumber: '__SOME_UUID__',
            fuelQuantity: 9001,
            passengers: 50,
          });
          throw new Error('should not reach here');
        } catch (error) {
          expect(error).toBeInstanceOf(JoiValidationError);
          expect(error.message).toMatchSnapshot();
        }
      });
    });
  });
});
