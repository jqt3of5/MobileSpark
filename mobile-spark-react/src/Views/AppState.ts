import {DrawableObject, Project} from "../common/dto";
import {SnapTo, ViewPort} from "../Components/CutView";

export interface AppState {
    project: Project | null,
    snapTo: SnapTo,
    viewPort:ViewPort,
    isUploadingNewGraphic: boolean,
}
export enum AppActionType {
    UpdateProject = 'update-project',
    ObjectChanged = 'graphic-changed',
    TextObjectAdded = 'text-object-added',
    ObjectDeleted = 'graphic-deleted',
    UpdateViewPort = 'update-view-port'
}

export type AppAction =
    | {type: AppActionType.UpdateProject, project: Project}
    | {type: AppActionType.UpdateViewPort, viewPort: ViewPort}
    | {type: AppActionType.ObjectChanged, object: DrawableObject}
    | {type: AppActionType.TextObjectAdded}
    | {type: AppActionType.ObjectDeleted, object: DrawableObject}
