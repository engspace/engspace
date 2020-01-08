export { DocumentDao, DocumentRevisionDao } from './document';
export { LoginDao } from './login';
export { ProjectDao } from './project';
export { UserDao } from './user';
export { MemberDao } from './member';

interface WithId<Id> {
    id: Id;
}

export function idsFindMap<Id, T extends WithId<Id>>(ids: readonly Id[], objs: T[]): T[] {
    return ids.map(id => objs.find(o => o.id == id));
}
