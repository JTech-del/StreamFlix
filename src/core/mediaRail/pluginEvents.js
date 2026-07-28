"use strict";


const events = {};



export function emit(event, data) {


    if (events[event]) {

        events[event]
            .forEach(callback =>
                callback(data)
            );

    }

}



export function subscribe(
    event,
    callback
) {


    if (!events[event]) {

        events[event] = [];

    }


    events[event]
        .push(callback);


}