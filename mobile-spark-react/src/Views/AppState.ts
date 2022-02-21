import {DrawableObject, Project} from "../common/dto";
import {SnapTo} from "../Components/CutView";

export interface AppState {
    project: Project | null,
    snapTo: SnapTo,
    isUploadingNewGraphic: boolean,
}
export enum AppActionType {
    UpdateProject = 'update-project',
    ObjectChanged = 'graphic-changed',
    TextObjectAdded = 'text-object-added',
    ObjectDeleted = 'graphic-deleted',
}

export type AppAction =
    | {type: AppActionType.UpdateProject, project: Project}
    | {type: AppActionType.ObjectChanged, object: DrawableObject}
    | {type: AppActionType.TextObjectAdded}
    | {type: AppActionType.ObjectDeleted, object: DrawableObject}
