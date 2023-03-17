import React, {useEffect, useRef, useState} from 'react';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { initNotifications, notify } from '@mycv/f8-notification';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import {Howl} from 'howler';
import './App.css';
import soundURL from './asset/mixkit-classic-alarm-995.wav';

var sound = new Howl({
  src: ['soundURL']
});



const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEl = 'touched';
const TRAINING_TIME = 50;
const TOUCHED_CONFIDENCE = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const model = useRef();
  const [touched, setTouched] = useState(false);
  const init = async () => {
    console.log("init..");
    await setupCamera();
    console.log('setup cacmera success');

     model.current = await mobilenet.load();

     classifier.current = knnClassifier.create();

    console.log('setup done');
    console.log('khong cham tay len mat va bam train 1');
    initNotifications({ cooldown: 3000 });
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;
      
        if (navigator.getUserMedia) {
          navigator.getUserMedia(
            { video: true},
            stream => {
                video.current.srcObject = stream;
                video.current.addEventListener('loadeddata',resolve);
            },
            error => reject(error)
          )
        } else {
          reject();
        }
    });
  }

  const train = async label =>{
    console.log(`[${label}] Dang train cho may khuan mat...`);
    for (let i=0 ; i < TRAINING_TIME; ++i){
      console.log(`Progress ${parseInt((i+1) / TRAINING_TIME * 100)}%`);
      await training(label);
    }
  
  }

/**
 * B1: Train cho may khuon mat khong cham tay
 * B2: Train cho may khuan mat co cham tay
 * B3: Lay hinh anh hien tai, phan tich va so sanh voi data da hoc truoc do
 * ==> neu ma matching voi data khuon mat cham tay ==> canh bao
 * @param {*} label 
 * @returns 
 */



  const training = label =>{
    return new Promise(async resolve =>{
      const embedding = model.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  }

  const run = async() => {
    const embedding = model.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
      if (
        result.label === TOUCHED_LABEl &&
        result.confidences[result.label] > TOUCHED_CONFIDENCE
      ) {
        console.log('Touched');
        if (canPlaySound.current) {
          canPlaySound.current = false;
          sound.play();
        }
        sound.play();
        notify('bo tay ra', { body: 'Ban vua cham tay vao mat.' });
        setTouched(true);
      } else {
        console.log('Not touch');
        setTouched(false);
      }

    await sleep(200);
    run();
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve,ms))
  }

  useEffect(() =>{
    init();
    sound.on('end', function(){
      canPlaySound.current = true;
    });

    return () => {

    }
  },[]);
  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
    
    <video
      ref={video}
      className="video" 
      autoPlay
    />
    <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}> Train 1</button>
        <button className="btn" onClick={() => train(TOUCHED_LABEl)}>Train 2</button>
        <button className="btn" onClick={() => run()}> Run</button>
    </div>
    </div>
    
  );
}

export default App;
