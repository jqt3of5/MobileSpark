// import {EngraveActionType, EngraveAppAction} from "../Views/EngraveAppState";
import * as React from "react";
import {Dispatch, MouseEvent, useEffect, useReducer, WheelEvent} from "react";
import {DrawableObject, DrawableObjectType,} from "../common/dto";
import {AppAction, AppActionType} from "../Views/AppState";
import './CutView.css'

export enum SnapTo {
    Continuous,
    OneHalf,
    OneQuarter,
    OneEighth,
    OneSixteenth,
    OneCentimeter,
    OneMillimeter
}

export interface ViewPort {
   width : number
   height : number
   x : number
   y : number
}
export interface CutViewProps {
    snapTo : SnapTo
    objects: DrawableObject[]
    viewport: ViewPort
    dispatch: Dispatch<AppAction>
}
enum MouseMode {
    Translate,
   ScaleTopLeft,
   ScaleTopRight,
   ScaleBottomRight,
   ScaleBottomLeft,
   Rotate,
   None
}
export interface CutViewState {
    mouseMode : MouseMode
    mouseX : number
    mouseY : number
    selectedGraphicIndex: number
    objects: DrawableObject[]
    hoverGraphicIndex: number
    dispatch: Dispatch<AppAction>
}

enum CutViewActionType {
    ObjectsLoaded,
    MouseClick,
    MouseMove,
    Zoom,
    Finish
}
type CutViewAction =
    | {type: CutViewActionType.ObjectsLoaded, objects: DrawableObject[]}
    | {type: CutViewActionType.MouseClick, mouseX: number, mouseY: number}
    | {type: CutViewActionType.MouseMove, mouseX: number, mouseY: number, viewPort: ViewPort}
    | {type: CutViewActionType.Zoom, scale: number, viewPort: ViewPort}
    | {type: CutViewActionType.Finish}

function reduce(state: CutViewState, action: CutViewAction)
{
   switch(action.type)
   {
       case CutViewActionType.Zoom:

           let newHeight =  action.viewPort.height + action.scale
           let newWidth = action.viewPort.width + action.scale*action.viewPort.width/action.viewPort.height

           if (newHeight < 500 || newWidth < 500 || newHeight > 50000 || newWidth > 50000)
           {
               newHeight = action.viewPort.height
               newWidth = action.viewPort.width
           }

           state.dispatch({type: AppActionType.UpdateViewPort, viewPort:{...action.viewPort, width:newWidth, height: newHeight}})
           return state

       case CutViewActionType.ObjectsLoaded:
           return {...state, objects:action.objects}

       case CutViewActionType.MouseClick:
           //Locate the first graphic that surrounds the cursor
           let selectedGraphicIndex = state.objects.findIndex(object => {
               return IsOnGraphicHandle(action.mouseX, action.mouseY, object) !==MouseMode.None
           })

           let mouseMode = selectedGraphicIndex === -1 ? MouseMode.Translate: IsOnGraphicHandle(action.mouseX, action.mouseY, state.objects[selectedGraphicIndex])

           return {...state, selectedGraphicIndex: selectedGraphicIndex, mouseX: action.mouseX, mouseY: action.mouseY, mouseMode: mouseMode}

       case CutViewActionType.Finish:
           return {...state, selectedGraphicIndex: -1,  mouseMode: MouseMode.None}

       case CutViewActionType.MouseMove:

           let mousedX = action.mouseX - state.mouseX
           let mousedY = action.mouseY - state.mouseY

           if (state.mouseMode === MouseMode.None)
           {
               let hoverGraphicIndex = state.objects.findIndex(group => {
                   return IsOnGraphicHandle(action.mouseX, action.mouseY, group) !==MouseMode.None
               })

               return {...state, hoverGraphicIndex: hoverGraphicIndex, selectedGraphicIndex: -1}
           }

           if (state.selectedGraphicIndex === -1)
           {
               state.dispatch({type: AppActionType.UpdateViewPort, viewPort:{...action.viewPort, y:action.viewPort.y - mousedY, x: action.viewPort.x - mousedX}})
               return state
           }

           let translateX = 0, translateY = 0, scaleX = 1, scaleY = 1
           let width = state.objects[state.selectedGraphicIndex].width
           let height = state.objects[state.selectedGraphicIndex].height

           switch(state.mouseMode)
           {
               // case MouseMode.None:
               //     break;
               case MouseMode.Translate:
                   translateX = mousedX
                   translateY = mousedY
                   break;
               case MouseMode.ScaleBottomRight:
                   scaleX = (width + mousedX) / width
                   scaleY = (height + mousedY) / height
                   scaleX = scaleX < .05 ? .05 : scaleX
                   scaleY = scaleY < .05 ? .05 : scaleY
                   scaleY = scaleX = Math.min(scaleY, scaleX)
                   break;
               case MouseMode.ScaleBottomLeft:
                   scaleX = (width - mousedX) / width
                   scaleY = (height + mousedY) / height

                   scaleX = scaleX < .05 ? .05 : scaleX
                   scaleY = scaleY < .05 ? .05 : scaleY
                   //aspect lock
                   scaleY = scaleX = Math.min(scaleY, scaleX)
                   translateX = width * (1 - scaleX)
                   translateY = 0
                   break;
               case MouseMode.ScaleTopRight:
                   scaleX = (width + mousedX) / width
                   scaleY = (height - mousedY) / height

                   scaleX = scaleX < .05 ? .05 : scaleX
                   scaleY = scaleY < .05 ? .05 : scaleY
                   //aspect lock
                   scaleY = scaleX = Math.min(scaleY, scaleX)

                   translateX = 0
                   translateY = height * (1 - scaleY)
                   break;
               case MouseMode.ScaleTopLeft:
                   scaleX = (width - mousedX) / width
                   scaleY = (height - mousedY) / height
                   scaleX = scaleX < .05 ? .05 : scaleX
                   scaleY = scaleY < .05 ? .05 : scaleY
                   //aspect lock
                   scaleY = scaleX = Math.min(scaleY, scaleX)

                   translateX = width * (1 - scaleX)
                   translateY = height * (1 - scaleY)
                   break;
               case MouseMode.Rotate:
                   break;
           }


           return {...state, objects: state.objects.map(group => {
                   if (group === state.objects[state.selectedGraphicIndex])
                   {
                       return {...group,
                           translateX: translateX, translateY: translateY,
                           scaleX: scaleX, scaleY: scaleY}
                   }
                   return group
               })}
   }
}

CutView.resizeHandleWidth = 10;
CutView.pxPerUnit = 100;
CutView.shadowBlur = 16;
CutView.objectMargin = 16;

export function CutView (props : CutViewProps) {

    const [state, dispatch] = useReducer(reduce, {
        mouseMode: MouseMode.None,
        selectedGraphicIndex: -1,
        hoverGraphicIndex: -1,
        //In canvas pixels, not client pixels
        mouseX: 0,
        mouseY: 0,
        objects: [],
        dispatch: props.dispatch
    })

    let canvasRef = React.createRef<HTMLCanvasElement>()

    function toCanvasPixels(x : number, y : number) : number[]
    {
        if (canvasRef.current != null)
            return [canvasRef.current.width/props.viewport.width * (x - props.viewport.x), canvasRef.current.height/props.viewport.height * (y - props.viewport.y)]

        return [x,y]
    }
    function toGlobalPixels(x : number, y : number) : number[]
    {
        if (canvasRef.current != null)
            return [props.viewport.width/canvasRef.current.width * x + props.viewport.x, props.viewport.height/canvasRef.current.height * y + props.viewport.y]

        return [x,y]
    }


    useEffect(() => {

        if (canvasRef.current !== null) {
            canvasRef.current.width = canvasRef.current.getBoundingClientRect().width
            canvasRef.current.height = canvasRef.current.getBoundingClientRect().height
        }
    }, [])
    //
    // useEffect(() => {
    //     function loadGraphics(objects : DrawableObject[]) {
    //         let promises = objects.map(object => {
    //             return new Promise<DrawableObject>(resolve => {
    //                 switch(object.type)
    //                 {
    //                     case DrawableObjectType.GraphicObject:
    //                         loadImage(object.url).then<GraphicObject>(image => {
    //                             object.image = image
    //                             return object
    //                         }).then(value => resolve(value))
    //                         break;
    //                     case DrawableObjectType.TextObject:
    //
    //                         let width = 0
    //                         let height = 0
    //                         if (canvasRef.current !== null)
    //                         {
    //                             let ctx = canvasRef.current.getContext("2d")
    //                             if (ctx !==null) {
    //
    //                                 ctx.textBaseline = "bottom"
    //                                 ctx.font = `${object.fontSize}px ${object.font}`
    //                                 let linesMeasures = object.text.split("\n").map(line => ctx!.measureText(line))
    //
    //                                 width  = Math.max(...linesMeasures.map(m => m.width))
    //                                 height = linesMeasures.map(measure => measure.actualBoundingBoxAscent).reduce((previousValue, currentValue) => {
    //                                     return previousValue + currentValue
    //                                 })
    //                             }
    //                         }
    //                         object.width = width
    //                         object.height = height
    //                         resolve(object)
    //                         break;
    //                 }
    //             })
    //         })
    //
    //         Promise.all(promises).then(groups => {
    //             dispatch({type: CutViewActionType.ObjectsLoaded, objects:groups})
    //         })
    //     }
    //     //load all a graphics
    //     loadGraphics(props.objects)
    //     // eslint-disable-next-line
    // }, [props.objects])

    useEffect(() => {
        if (canvasRef.current !== null)
        {
            let ctx = canvasRef.current.getContext("2d")
            if (ctx !== null) {
                ctx.textBaseline = "bottom"

                ctx.clearRect(0,0,canvasRef.current.width, canvasRef.current.height)

                drawObjects(ctx)
            }
        }
    }, [state.objects, state.hoverGraphicIndex, state.selectedGraphicIndex, props.viewport])

    return (
        <canvas ref={canvasRef} className={"cut-view-canvas"} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onWheel={onScroll}/>
    )

    function drawObjects(ctx : CanvasRenderingContext2D)  {

        let root = 100
        ctx.fillStyle = '#000000'
        let maxDots = 50
        let vw = props.viewport.x + props.viewport.width
        let vh = props.viewport.y + props.viewport.height

        while (props.viewport.width/root > maxDots)
        {
            root = root*2
        }

        let startX = Math.floor(props.viewport.x/root)*root
        let startY =Math.floor(props.viewport.y/root)*root
        for (let vy = startY; vy < vh; vy += root)
        {
            for (let vx = startX; vx < vw; vx += root)
            {
                let [x, y] = toCanvasPixels(vx, vy)
                ctx.beginPath()
                ctx.arc(x, y, 1, 0, 2*Math.PI)
                ctx.fill()
            }
        }

        for (const object of state.objects) {

            //TODO: We will have all the objects in the list, but we don't want to draw all of them.
            //TODO: Filter to only those within the viewport

            //TODO: Objects will be in global coordinates, but we'll need to convert them to canvas coordinates
            let startX = object.startX + object.translateX
            let startY = object.startY + object.translateY
            let width = object.width * object.scaleX
            let height = object.height * object.scaleY

            //draw boundary rectangle
            ctx.beginPath()
            ctx.lineWidth = 2
            ctx.strokeStyle = '#7777ff'
            ctx.rect(startX -  CutView.objectMargin, startY - CutView.objectMargin, width + CutView.objectMargin*2, height + CutView.objectMargin*2)
            ctx.stroke()

            drawScaleHandles(startX, startY, width,height)

            switch (object.type) {
                case DrawableObjectType.GraphicObject:
                    if (object.image !== null) {
                        //draw image
                        ctx.drawImage(object.image,
                            startX + object.translateX * object.scaleX,
                            startY + object.translateY * object.scaleY,
                            object.width * object.scaleX,
                            object.height * object.scaleY)
                    }
                    break;
                case DrawableObjectType.TextObject:
                    //TODO: TextObjects should have a background shape with a color
                    ctx.font = `${object.fontSize*object.scaleX}px ${object.font}`
                    ctx.strokeStyle = 'black'
                    ctx.fillStyle = 'black'
                    ctx.lineWidth = 1

                    ctx.save()
                    ctx.translate(startX, startY)
                    ctx.textAlign =  object.textAlign
                    for (const line of object.text.split('\n')) {

                        ctx.translate(0, ctx.measureText(line).actualBoundingBoxAscent)

                        let textStart = 0
                        switch(object.textAlign)
                        {
                            case "center":
                                textStart = width/2
                                break;
                            case "end":
                            case "right":
                                textStart = width
                                break;
                            case "left":
                            case "start":
                                break;
                        }

                        ctx.fillText(line, textStart, 0, width)
                    }
                    ctx.restore()
                    break;
            }

            if (state.selectedGraphicIndex !==-1 && object===state.objects[state.selectedGraphicIndex])
            {
                //IF current object is selected
            }
            else if (state.hoverGraphicIndex !==-1 && object===state.objects[state.hoverGraphicIndex]) {
                //IF current object is hovered
                //TODO: Most likely we don't want the handles to show unless we are hovering. It might clutter
            }
        }
        function drawScaleHandles(startX : number, startY : number, width : number,height : number){
            //draw scale handles
            ctx.beginPath()
            ctx.fillStyle = "white"
            ctx.lineWidth = 4
            let halfSize = CutView.resizeHandleWidth / 2
            //top left
            ctx.rect(startX - halfSize - CutView.objectMargin, startY - halfSize - CutView.objectMargin, CutView.resizeHandleWidth, CutView.resizeHandleWidth)
            //top right
            ctx.rect(startX + width - halfSize + CutView.objectMargin, startY - halfSize - CutView.objectMargin, CutView.resizeHandleWidth, CutView.resizeHandleWidth)
            //bottom left
            ctx.rect(startX - halfSize - CutView.objectMargin, startY + height - halfSize + CutView.objectMargin, CutView.resizeHandleWidth, CutView.resizeHandleWidth)
            //bottom right
            ctx.rect(startX + width - halfSize + CutView.objectMargin, startY + height- halfSize + CutView.objectMargin, CutView.resizeHandleWidth, CutView.resizeHandleWidth)
            ctx.stroke()
            ctx.fill()
        }
    }

    function onScroll (event : WheelEvent<HTMLCanvasElement>) {
        event.preventDefault()

        if (canvasRef.current != null)
        {
            dispatch({type: CutViewActionType.Zoom, scale: event.deltaY, viewPort:props.viewport})
        }
    }

    function onMouseDown (event : MouseEvent<HTMLCanvasElement>) {
        if (canvasRef.current !==null)
        {
            let rect = canvasRef.current.getBoundingClientRect()
            let canvasX = (event.clientX - rect.x) / rect.width * canvasRef.current.width
            let canvasY = (event.clientY - rect.y) / rect.height * canvasRef.current.height

            let [globalX, globalY] = toGlobalPixels(canvasX, canvasY)
            dispatch({type: CutViewActionType.MouseClick, mouseX: globalX,  mouseY:globalY})
        }
    }

    function onMouseUp (event : MouseEvent<HTMLCanvasElement>) {
        if (state.selectedGraphicIndex !==-1)
        {
            let object = state.objects[state.selectedGraphicIndex]

            props.dispatch({type: AppActionType.ObjectChanged, object: object})
        }
        dispatch({type: CutViewActionType.Finish})
    }

    function onMouseMove (event : MouseEvent<HTMLCanvasElement>) {
        if (canvasRef.current !==null)
        {
            let rect = canvasRef.current.getBoundingClientRect()
            let canvasX = (event.clientX - rect.x) / rect.width * canvasRef.current.width
            let canvasY = (event.clientY - rect.y) / rect.height * canvasRef.current.height

            let [globalX, globalY] = toGlobalPixels(canvasX, canvasY)

            canvasRef.current.style.cursor = (mode => {
                switch(mode)
                {
                    case MouseMode.ScaleBottomLeft:
                        return "sw-resize"
                    case MouseMode.ScaleBottomRight:
                        return "se-resize"
                    case MouseMode.ScaleTopRight:
                        return "ne-resize"
                    case MouseMode.ScaleTopLeft:
                        return "nw-resize"
                }
                return "default"
            })(state.mouseMode)

            dispatch({type: CutViewActionType.MouseMove, mouseX:globalX, mouseY: globalY, viewPort:props.viewport})
        }
    }

    function loadImage(url : string): Promise<HTMLImageElement> {
        return new Promise<HTMLImageElement>(resolve => {

            let image = new Image()
            image.src = process.env.REACT_APP_API + url
            image.onload = () => {
                resolve(image)
            }
        })
    }
}

function IsInRectBounds(tx : number, ty : number, x : number, y:number, w: number, h:number): boolean {
    return tx <= x + w && tx >= x && ty >= y && ty <= y + h
}

function IsOnGraphicHandle(canvasX:number, canvasY:number, graphic : DrawableObject) : MouseMode {
    let clickTargetSize = CutView.resizeHandleWidth * 2

    if (IsInRectBounds(canvasX, canvasY, graphic.startX + graphic.translateX - CutView.resizeHandleWidth - CutView.objectMargin, graphic.startY + graphic.translateY - CutView.resizeHandleWidth - CutView.objectMargin, clickTargetSize, clickTargetSize))
    {
        return MouseMode.ScaleTopLeft
    }
    if (IsInRectBounds(canvasX, canvasY, graphic.startX + graphic.translateX + graphic.width - CutView.resizeHandleWidth + CutView.objectMargin, graphic.startY + graphic.translateY - CutView.resizeHandleWidth - CutView.objectMargin, clickTargetSize, clickTargetSize))
    {
        return MouseMode.ScaleTopRight
    }
    if (IsInRectBounds(canvasX, canvasY, graphic.startX + graphic.translateX - CutView.resizeHandleWidth - CutView.objectMargin, graphic.startY + graphic.translateY + graphic.height - CutView.resizeHandleWidth + CutView.objectMargin, clickTargetSize, clickTargetSize))
    {
        return MouseMode.ScaleBottomLeft
    }
    if (IsInRectBounds(canvasX, canvasY, graphic.startX + graphic.translateX + graphic.width - CutView.resizeHandleWidth + CutView.objectMargin, graphic.startY + graphic.translateY + graphic.height- CutView.resizeHandleWidth + CutView.objectMargin, clickTargetSize, clickTargetSize) )
    {
        return MouseMode.ScaleBottomRight
    }

    if (IsInRectBounds(canvasX, canvasY, graphic.startX + graphic.translateX, graphic.startY + graphic.translateY, graphic.width, graphic.height))
    {
        return MouseMode.Translate
    }
    return MouseMode.None
}
