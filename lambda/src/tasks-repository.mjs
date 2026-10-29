import {
  DynamoDBClient,
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

function toItem(task) {
  const item = {
    id: { S: task.id },
    title: { S: task.title },
    description: { S: task.description ?? '' },
    completed: { BOOL: task.completed },
    priority: { S: task.priority },
    createdAt: { S: task.createdAt },
    updatedAt: { S: task.updatedAt },
  };
  item.dueDate = task.dueDate ? { S: task.dueDate } : { NULL: true };
  return item;
}

function fromItem(item) {
  if (!item) {
    return null;
  }
  return {
    id: item.id.S,
    title: item.title.S,
    description: item.description?.S ?? '',
    completed: item.completed?.BOOL ?? false,
    priority: item.priority?.S ?? 'medium',
    dueDate: item.dueDate?.S ?? null,
    createdAt: item.createdAt.S,
    updatedAt: item.updatedAt.S,
  };
}

export function createTaskRepository({ tableName, dynamoClient = client }) {
  if (!tableName) {
    throw new Error('TABLE_NAME is required');
  }

  return {
    async scan() {
      const items = [];
      let lastEvaluatedKey;
      do {
        const result = await dynamoClient.send(
          new ScanCommand({ TableName: tableName, ExclusiveStartKey: lastEvaluatedKey }),
        );
        for (const item of result.Items ?? []) {
          items.push(fromItem(item));
        }
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);
      return items;
    },

    async get(id) {
      const result = await dynamoClient.send(
        new GetItemCommand({ TableName: tableName, Key: { id: { S: id } } }),
      );
      return fromItem(result.Item);
    },

    async put(task) {
      await dynamoClient.send(
        new PutItemCommand({ TableName: tableName, Item: toItem(task) }),
      );
      return task;
    },

    async remove(id) {
      await dynamoClient.send(
        new DeleteItemCommand({ TableName: tableName, Key: { id: { S: id } } }),
      );
    },
  };
}

export { toItem, fromItem };
