export { DocumentDao, DocumentRevisionDao } from './document';
export { LoginDao } from './login';
export { MemberDao } from './member';
export { PartBaseDao, PartDao, PartFamilyDao, PartRevisionDao } from './part';
export { ProjectDao } from './project';
export { SpecificationDao, SpecRevisionDao } from './specification';
export { UserDao } from './user';

interface WithId<Id> {
    id: Id;
}

export function idsFindMap<Id, T extends WithId<Id>>(ids: readonly Id[], objs: T[]): T[] {
    return ids.map(id => objs.find(o => o.id == id));
}
