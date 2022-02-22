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
    //global pixels
    width : number
    height : number
    startX : number
    startY : number
}

export interface TextObject {
    type: DrawableObjectType.TextObject
    text : string,
    font : string,
    fontSize : number,
    textAlign: CanvasTextAlign,
    //backgroundColor: Color
    //backgroundShape: Shape

    //global pixels
    width : number
    height : number
    startX : number
    startY : number
}

export type DrawableObject = GraphicObject | TextObject

export interface Project {
    projectId: string,
    objects : DrawableObject [],
}