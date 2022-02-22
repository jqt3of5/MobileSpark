import {CutView, SnapTo} from "../Components/CutView";
import {AppAction, AppActionType, AppState} from "./AppState";
import {useEffect, useReducer} from "react";
import {useCookies} from "react-cookie";
import {v4 as uuidv4} from 'uuid';
import axios from 'axios';
import './MobileSpark.css'
import {DrawableObjectType} from "../common/dto";

function reducer(state: AppState, action :AppAction) : AppState
{
    switch(action.type)
    {
        case AppActionType.ObjectChanged:
        case AppActionType.ObjectDeleted:
        case AppActionType.TextObjectAdded:
        case AppActionType.UpdateProject:
            return state
        case AppActionType.UpdateViewPort:
            return {...state, viewPort:action.viewPort}
    }
}
export function MobileSpark() {
    var [state, dispatch] = useReducer(reducer, {
        project: {projectId: "12345", objects:[
            { type: DrawableObjectType.TextObject,
                text : "hello!",
                font : "Arial",
                fontSize : 14,
                textAlign: "center",
                //global pixels
                width : 100,
                height : 100,
                startX : 100,
                startY : 100 }]},
        viewPort: {width: 1903, height: 1000, x: -500, y: -500},
        snapTo: SnapTo.Continuous,
        isUploadingNewGraphic: false,
    })

    //TODO: Use react router so that we can have guids in the url and share them
    const [cookies, setCookie] = useCookies(['projectId', 'userId'])
    if (cookies.projectId===undefined)
    {
        setCookie('projectId', uuidv4())
    }

    if (cookies.userId === undefined)
    {
        setCookie('userId', uuidv4())
    }

    //TODO: Enable when we have a backend
    // useEffect(() => {
    //     if (cookies.projectId !== undefined)
    //     {
    //         axios.get(process.env.REACT_APP_API + "/project/" + cookies.projectId).then(response => {
    //             dispatch({type:AppActionType.UpdateProject,  project: response.data})
    //         }).catch(reason => console.log(reason))
    //     }
    // }, [cookies.projectId])


   return (
       <div className={"mobile-spark-main"}>
           {state.project != null &&
               <CutView snapTo={state.snapTo} objects={state.project.objects} viewport={state.viewPort} dispatch={dispatch}/>
           }
       </div>
   )
}