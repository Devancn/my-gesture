function enableGesture(element) {
  let contexts = Object.create(null);

  let MOUSE_SYMBOL = Symbol("mouse");

  if (document.ontouchstart !== null)
    // 判断是pc还是手机模式，手机模式为null
    element.addEventListener("mousedown", (event) => {
      contexts[MOUSE_SYMBOL] = Object.create(null);
      start(event, contexts[MOUSE_SYMBOL]);
      let mousemove = (event) => {
        move(event, contexts[MOUSE_SYMBOL]);
      };

      let mouseend = (event) => {
        end(event, contexts[MOUSE_SYMBOL]);
        document.removeEventListener("mousemove", mousemove);
        document.removeEventListener("mouseup", mouseend);
      };

      document.addEventListener("mousemove", mousemove);
      document.addEventListener("mouseup", mouseend);
    });

  element.addEventListener("touchstart", (event) => {
    for (let touch of event.changedTouches) {
      contexts[touch.identifier] = Object.create(null);
      start(touch, contexts[touch.identifier]);
    }
  });

  element.addEventListener("touchmove", (event) => {
    for (let touch of event.changedTouches) {
      move(touch, contexts[touch.identifier]);
    }
  });

  element.addEventListener("touchend", (event) => {
    for (let touch of event.changedTouches) {
      end(touch, contexts[touch.identifier]);
      delete contexts[touch.identifier];
    }
  });

  element.addEventListener("touchcancel", (event) => {
    for (let touch of event.changedTouches) {
      cancel(touch, contexts[touch.identifier]);
      delete contexts[touch.identifier];
    }
  });

  //tap
  //pan - panstart panmove panend
  //flick
  //press - pressstart pressend

  let start = (point, context) => {
    element.dispatchEvent(
      new CustomEvent("start", {
        startX: point.clientX,
        startY: point.clientY,
        clientX: point.clientX,
        clientY: point.clientY,
      })
    );
    (context.startX = point.clientX), (context.startY = point.clientY);
    context.moves = [];
    context.isTap = true;
    context.isPan = false;
    context.isPress = false;
    context.timeoutHandler = setTimeout(() => {
      if (context.isPan) return;

      context.isTap = false;
      context.isPan = false;
      context.isPress = true;
      element.dispatchEvent(new CustomEvent("pressstart", {}));
    }, 500);
  };

  let move = (point, context) => {
    let dx = point.clientX - context.startX,
      dy = point.clientY - context.startY;

    if (dx ** 2 + dy ** 2 > 100 && !context.isPan) {
      if (context.isPress)
        element.dispatchEvent(new CustomEvent("presscancel", {}));
      context.isTap = false;
      context.isPan = true;
      context.isPress = false;
      element.dispatchEvent(
        new CustomEvent("panstart", {
          startX: context.startX,
          startY: context.startY,
          clientX: point.clientX,
          clientY: point.clientY,
        })
      );
    }

    context.moves = context.moves.filter(
      (record) => Date.now() - record.t < 300
    );

    if (context.isPan) {
      context.moves.push({
        dx,
        dy,
        t: Date.now(),
      });
      element.dispatchEvent(
        new CustomEvent("pan", {
          detail: {
            startX: context.startX,
            startY: context.startY,
            clientX: point.clientX,
            clientY: point.clientY,
          },
        })
      );
    }

    // console.log("move", dx, dy)
  };

  let end = (point, context) => {
    if (context.isPan) {
      let dx = point.clientX - context.startX,
        dy = point.clientY - context.startY;
      // console.log(context.moves);
      let record = context.moves[0];
      let speed =
        Math.sqrt((record.dx - dx) ** 2 + (record.dy - dy) ** 2) /
        (Date.now() - record.t);
      // console.log(speed);
      let isFlick = speed > 2.5;
      if (isFlick) {
        element.dispatchEvent(
          new CustomEvent("flick", {
            startX: context.startX,
            startY: context.startY,
            clientX: point.clientX,
            clientY: point.clientY,
            speed,
          })
        );
      }

      element.dispatchEvent(
        new CustomEvent("panend", {
          detail: {
            startX: context.startX,
            startY: context.startY,
            clientX: point.clientX,
            clientY: point.clientY,
            speed,
            isFlick,
          },
        })
      );
    }

    if (context.isTap) {
      element.dispatchEvent(new CustomEvent("tap", {}));
    }

    if (context.isPress) element.dispatchEvent(new CustomEvent("pressend", {}));

    clearTimeout(context.timeoutHandler);
  };

  let cancel = (point, context) => {
    element.dispatchEvent(new CustomEvent("canceled", {}));
    clearTimeout(context.timeoutHandler);
  };
}
