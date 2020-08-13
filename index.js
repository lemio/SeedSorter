let video = document.getElementById('videoInput');
let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
let dst = new cv.Mat(video.height, video.width, cv.CV_8UC4);
const constraints = {
    video: true
  };
navigator.mediaDevices.getUserMedia(constraints).
then((stream) => {  video.srcObject = stream;
                     processVideo()}
                     );

let cap = new cv.VideoCapture(video);
let OPEN = true;
let CLOSED = false;
let servoStatus1 = OPEN;
let amountOfVerifiedSeeds = 0;
let vibrationRequest = false;

/*
Everything that has to do with communicating with the Arudino
*/
var outputStream, inputStream;
var reader, writer;
async function clickConnect(){
    await connect();
  }
//If the connect button is pressed
async function connect(){
    try{
    const requestOptions = {
        // Filter on devices with the Arduino USB vendor ID.
        filters: [{ vendorId: 0x2341 }],
      };
      port = await navigator.serial.requestPort(/*requestOptions*/);
    }catch(error){
      alert("Please use Google Chrome and turn on the experimental-web-platform-features")
    }
      
    // - Wait for the port to open.
    await port.open({ baudrate: 9600 });
    let decoder = new TextDecoderStream();
    inputDone = port.readable.pipeTo(decoder.writable);
    inputStream = decoder.readable;
    reader = inputStream.getReader();
    
    const encoder = new TextEncoderStream();
outputDone = encoder.readable.pipeTo(port.writable);
outputStream = encoder.writable;
//writer = outputStream.getWriter();
}

async function writeToStream(line){
    const writer = outputStream.getWriter();
  
    writer.write(line);
  
  writer.releaseLock();
  }
const FPS = 30;
function processVideo() {
    try {
        /*
        if (!streaming) {
            // clean and stop.
            src.delete();
            dst.delete();
            return;
        }*/
        let begin = Date.now();
        // start processing.
        cap.read(src);
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        cv.threshold(dst, dst, Number(document.getElementById("threshold").value), 200, cv.THRESH_BINARY);
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
let hull = new cv.MatVector();
        cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
        amountOfVerifiedSeeds = 0;
for (let i = 0; i < contours.size(); ++i) {
    let colorHull = new cv.Scalar(255,0,0);
    cv.drawContours(dst, contours, i, colorHull, 1, 8, hierarchy, 0);
let cnt = contours.get(i)
    if(cnt.rows>4){
    let seedEllipse = cv.fitEllipse(cnt);
    //Check of dit waarschijnlijk een zaadje is...

    if (seedEllipse.size.width+seedEllipse.size.height<200){
        //
        if (seedEllipse.center.x>100&&seedEllipse.center.x<160){
            if (seedEllipse.center.y>100&&seedEllipse.center.y<180){
                //Hier heeft die een zaadje gevonden in het midden...

                //Check of het zaadje groter is dan 30 en kleiner is dan 60 
                if (seedEllipse.size.height > 30 && seedEllipse.size.height < 60){

                //Zeg tegen de interface hoe groot die is
                document.getElementById("seedWidth").innerHTML = Math.round(seedEllipse.size.width) + "px"
                document.getElementById("seedHeight").innerHTML = Math.round(seedEllipse.size.height) + "px"

                amountOfVerifiedSeeds += 1;
                
                //Get the values from the interface
                s1_max = Number(document.getElementById("s1_max").value)
                s1_min = Number(document.getElementById("s1_min").value)
                s1_delay = Number(document.getElementById("s1_delay").value)

                
                //Check of die de juite grootte heeft voor servo 1
                //console.log(seedEllipse.size.height,s1_min,seedEllipse.size.height,s1_max)
                if(seedEllipse.size.height > s1_min && seedEllipse.size.height < s1_max){
                    console.log("Servo Actie")
                    if (servoStatus1 === OPEN){
                    triggerServo(1,CLOSED);

                    setTimeout(()=> triggerServo(1,OPEN),s1_delay)
                    }
                }

                }
            
            }

        }
    //console.log(seedEllipse);
    
    //console.log(seedEllipse)
let ellipseColor = new cv.Scalar(100, 100, 100);
cv.ellipse1(dst, seedEllipse, ellipseColor, 1, cv.LINE_8);
    }
/*
    var board = new five.Board();

board.on("ready", function() {
  var led = new five.Led(13);
  led.blink(500);
});*/
/*
cv.putText(dst,
  String("hello"),
  ,
  cv.FONT_ITALIC,
  2,
  { color: ellipseColor, thickness: 2 }
);*/

  }



}

        //Wanneer hij geen zaadje heeft gezien voor 3 seconden, start de trillmotor
        if (amountOfVerifiedSeeds == 0){
            if (vibrationRequest == false){
            vibrationRequest = true;
            setTimeOut(triggerVibrator, 3000)
            }

        }
        cv.imshow('canvasOutput', dst);
        // schedule the next one.
        let delay = 1000/FPS - (Date.now() - begin);
        setTimeout(processVideo, delay);
    } catch (err) {
        console.log(err)
        //utils.printError(err);
    }
};
let valueRed = 0
let valueGreen = 0
let valueBlue = 0;
function triggerServo(servoNumber, value){
    if (servoNumber == 1){
        servoStatus1 = value;
    valueRed = value?0:60;
    }
    if (servoNumber == 2){
    valueGreen = value?60:0;
    }
    console.log("background-color: rgb("+valueRed+"%,"+valueGreen+"%,0%)");
    document.getElementById("box").style = "background-color: rgb("+valueRed+"%,"+valueGreen+"%,"+valueBlue+"%)";

}
function triggerVibrator(){
    valueRed = 100;
    setTimeout(stopVibrator, 300);
}
function stopVibrator(){
    vibrationRequest = false
    valueRed = 0;
}
// schedule the first one.
setTimeout(processVideo, 0);
