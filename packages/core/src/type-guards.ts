import { IdOr, User } from '.';

export function isUser(user: IdOr<User>): user is User {
    return typeof user['name'] !== 'undefined' && typeof user['email'] !== 'undefined';
}
