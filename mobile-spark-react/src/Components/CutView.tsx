import {Dispatch, MouseEvent, WheelEvent, useEffect, useReducer} from "react";
import {
    DrawableObject,
    DrawableObjectType, GraphicObject,
    TextObject,
} from "../common/dto";
// import {EngraveActionType, EngraveAppAction} from "../Views/EngraveAppState";
import * as React from "react";
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
    viewport: ViewPort
}

enum CutViewActionType {
    ObjectsLoaded,
    SetViewBounds,
    Select,
    Transform,
    Hover,
    Zoom,

    Finish
}
type CutViewAction =
    | {type: CutViewActionType.ObjectsLoaded, objects: DrawableObject[]}
    | {type: CutViewActionType.SetViewBounds, width: number, height: number}
    | {type: CutViewActionType.Select, mouseX: number, mouseY: number}
    | {type: CutViewActionType.Hover, mouseX: number, mouseY: number}
    | {type: CutViewActionType.Transform, mousedX: number, mousedY: number}
    | {type: CutViewActionType.Zoom, scale: number}
    | {type: CutViewActionType.Finish}

function reduce(state: CutViewState, action: CutViewAction)
{
    //TODO: How do we pass state up to the parent component?
   switch(action.type)
   {
       case CutViewActionType.SetViewBounds:
           return {...state, viewport: {...state.viewport, width: action.width, height: action.height}}

       case CutViewActionType.Zoom:

           let newHeight =  state.viewport.height + action.scale
           let newWidth = state.viewport.width + action.scale*state.viewport.width/state.viewport.height

           if (newHeight < 200 || newWidth < 200 || newHeight > 5000 || newWidth > 5000)
           {
               newHeight = state.viewport.height
               newWidth = state.viewport.width
           }

           return {...state, viewport:{...state.viewport, height:newHeight , width: newWidth}}

       case CutViewActionType.ObjectsLoaded:
           return {...state, objects:action.objects}

       case CutViewActionType.Select:
           //Locate the first graphic that surrounds the cursor
           let selectedGraphicIndex = state.objects.findIndex(object => {
               return IsOnGraphicHandle(action.mouseX, action.mouseY, object) !==MouseMode.None
           })

           let mouseMode = selectedGraphicIndex===-1 ? MouseMode.Translate: IsOnGraphicHandle(action.mouseX, action.mouseY, state.objects[selectedGraphicIndex])

           return {...state, selectedGraphicIndex: selectedGraphicIndex, mouseX: action.mouseX, mouseY: action.mouseY, mouseMode: mouseMode}
       case CutViewActionType.Hover:
           let hoverGraphicIndex = state.objects.findIndex(group => {
               return IsOnGraphicHandle(action.mouseX, action.mouseY, group) !==MouseMode.None
           })

           return {...state, hoverGraphicIndex: hoverGraphicIndex, selectedGraphicIndex: -1}
       case CutViewActionType.Finish:
           return {...state, selectedGraphicIndex: -1,  mouseMode: MouseMode.None}
       case CutViewActionType.Transform:

           let translateX = 0, translateY = 0, scaleX = 1, scaleY = 1
           let width = state.objects[state.selectedGraphicIndex].width
           let height = state.objects[state.selectedGraphicIndex].height

           switch(state.mouseMode)
           {
               case MouseMode.None:
                   break;
               case MouseMode.Translate:
                   translateX = action.mousedX
                   translateY = action.mousedY
                   break;
               case MouseMode.ScaleBottomRight:
                   scaleX = (width + action.mousedX) / width
                   scaleY = (height + action.mousedY) / height
                   scaleX = scaleX < .05 ? .05 : scaleX
                   scaleY = scaleY < .05 ? .05 : scaleY
                   scaleY = scaleX = Math.min(scaleY, scaleX)
                   break;
               case MouseMode.ScaleBottomLeft:
                   scaleX = (width - action.mousedX) / width
                   scaleY = (height + action.mousedY) / height

                   scaleX = scaleX < .05 ? .05 : scaleX
                   scaleY = scaleY < .05 ? .05 : scaleY
                   //aspect lock
                   scaleY = scaleX = Math.min(scaleY, scaleX)
                   translateX = width * (1 - scaleX)
                   translateY = 0
                   break;
               case MouseMode.ScaleTopRight:
                   scaleX = (width + action.mousedX) / width
                   scaleY = (height - action.mousedY) / height

                   scaleX = scaleX < .05 ? .05 : scaleX
                   scaleY = scaleY < .05 ? .05 : scaleY
                   //aspect lock
                   scaleY = scaleX = Math.min(scaleY, scaleX)

                   translateX = 0
                   translateY = height * (1 - scaleY)
                   break;
               case MouseMode.ScaleTopLeft:
                   scaleX = (width - action.mousedX) / width
                   scaleY = (height - action.mousedY) / height
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

           //TODO: If no object is selected, we are transforming the viewport

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
        //TODO: Who should own this?
        viewport: props.viewport,
        //In canvas pixels, not client pixels
        mouseX: 0,
        mouseY: 0,
        objects: [],
    })

    let canvasRef = React.createRef<HTMLCanvasElement>()

    useEffect(() => {
        if (canvasRef.current !== null) {
            //After the view has loaded, set the viewport equal to the bounds of the canvas
            //TODO: We probably don't want to set the bounds exacly because we should be saving the viewport, but want to maintain the aspect ratio.
            dispatch({type: CutViewActionType.SetViewBounds, width:canvasRef.current.getBoundingClientRect().width, height: canvasRef.current.getBoundingClientRect().height})
        }
    }, [])

    useEffect(() => {
        function loadGraphics(objects : DrawableObject[]) {
            let promises = objects.map(object => {
                return new Promise<DrawableObject>(resolve => {
                    switch(object.type)
                    {
                        case DrawableObjectType.GraphicObject:
                            loadImage(object.url).then<GraphicObject>(image => {
                                object.image = image
                                return object
                            }).then(value => resolve(value))
                            break;
                        case DrawableObjectType.TextObject:

                            let width = 0
                            let height = 0
                            if (canvasRef.current !== null)
                            {
                                let ctx = canvasRef.current.getContext("2d")
                                if (ctx !==null) {

                                    ctx.textBaseline = "bottom"
                                    ctx.font = `${object.fontSize}px ${object.font}`
                                    let linesMeasures = object.text.split("\n").map(line => ctx!.measureText(line))

                                    width  = Math.max(...linesMeasures.map(m => m.width))
                                    height = linesMeasures.map(measure => measure.actualBoundingBoxAscent).reduce((previousValue, currentValue) => {
                                        return previousValue + currentValue
                                    })
                                }
                            }
                            object.width = width
                            object.height = height
                            resolve(object)
                            break;
                    }
                })
            })

            Promise.all(promises).then(groups => {
                dispatch({type: CutViewActionType.ObjectsLoaded, objects:groups})
            })
        }
        //load all a graphics
        loadGraphics(props.objects)
        // eslint-disable-next-line
    }, [props.objects])

    useEffect(() => {
        if (canvasRef.current !== null)
        {
            let ctx = canvasRef.current.getContext("2d")
            if (ctx !== null) {
                ctx.textBaseline = "bottom"

                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

                console.log("viewport width" + state.viewport.width + "viewport height" + state.viewport.height)

                let order = 10
                let minDots = 80
                let maxDotSpacing = state.viewport.width/minDots
                //Find the largest order of dots less than our max spacing
                let dotSpacingNormalized = order
                while (dotSpacingNormalized+order < maxDotSpacing)
                {
                    dotSpacingNormalized = dotSpacingNormalized+order
                }

                let startX = (state.viewport.x/dotSpacingNormalized)*dotSpacingNormalized
                let startY = (state.viewport.y/dotSpacingNormalized)*dotSpacingNormalized
                let heightRatio = state.viewport.height/canvasRef.current.height
                let widthRatio = state.viewport.width/canvasRef.current.width

                //TODO: I want dots drawn on the canvas for alignment and visual appeal. However, I want then to scale/fade/etc in a nice way
                for (let row = startY; row < startY + state.viewport.height; row += dotSpacingNormalized)
                {
                    for (let col = startX; col < startX + state.viewport.width; col+= dotSpacingNormalized)
                    {
                        let depth = 0
                        let o = order
                        while (row%o === 0 && col%o === 0)
                        {
                            o = o * order
                            depth += 1
                        }

                        ctx.fillStyle = '#555555'
                        ctx.beginPath()
                        ctx.arc((col - startX)/widthRatio, (row- startY)/heightRatio, dotSpacingNormalized/order*heightRatio, 0, 2*Math.PI)
                        ctx.fill()
                    }
                }

                drawObjects(ctx)
            }
        }
    }, [state.objects, state.hoverGraphicIndex, state.selectedGraphicIndex, state.viewport, props.viewport])

    return (
        <canvas ref={canvasRef} width={state.viewport.width} height={state.viewport.height} className={"cut-view-canvas"} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onWheel={onScroll}/>
    )

    function drawObjects(ctx : CanvasRenderingContext2D)  {
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
            dispatch({type: CutViewActionType.Zoom, scale: event.deltaY})
        }
    }

    function onMouseDown (event : MouseEvent<HTMLCanvasElement>) {
        if (canvasRef.current !==null)
        {
            let rect = canvasRef.current.getBoundingClientRect()
            let canvasX = (event.clientX - rect.x) / rect.width * canvasRef.current.width
            let canvasY = (event.clientY - rect.y) / rect.height * canvasRef.current.height

            dispatch({type: CutViewActionType.Select, mouseX: canvasX,  mouseY:canvasY})
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

            if (state.mouseMode !==MouseMode.None)
            {
                dispatch({type: CutViewActionType.Transform, mousedX:canvasX - state.mouseX, mousedY: canvasY - state.mouseY})
            }
            else
            {
                dispatch({type: CutViewActionType.Hover, mouseX:canvasX, mouseY: canvasY})
            }
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
