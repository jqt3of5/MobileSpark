import {ViewPort} from "../Components/CutView";

export interface UploadedFile {
    fieldname: string,
    originalname: string,
    encoding: string,
    mimetype: string,
    buffer: Buffer,
    size: number
}

export enum DrawableObjectType {
    GraphicObject = "GraphicObject",
    TextObject = "TextObject"
}

export interface GraphicObject {
    type: DrawableObjectType.GraphicObject
    image : HTMLImageElement | null
    guid: string,
    url: string,
    mimetype: string,
    //Canvas pixels
    width : number
    height : number
    translateX : number
    translateY : number
    scaleX : number
    scaleY : number
    startX : number
    startY : number
}

export interface TextObject {
    type: DrawableObjectType.TextObject
    text : string,
    font : string,
    fontSize : number,
    textAlign: CanvasTextAlign,
    //Canvas pixels
    width : number
    height : number
    translateX : number
    translateY : number
    scaleX : number
    scaleY : number
    startX : number
    startY : number
}

export type DrawableObject = GraphicObject | TextObject

export interface Project {
    projectId: string,
    viewPort : ViewPort,
    objects : DrawableObject [],
}