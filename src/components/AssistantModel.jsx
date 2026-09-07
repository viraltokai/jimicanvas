import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MODEL_URL = '/chat/assistant-black-cat.glb?v=4'

function findObject(root, ...names) {
  let found
  root.traverse((object) => {
    if (!found && names.includes(object.name)) found = object
  })
  return found
}

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta)
}

export default function AssistantModel() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const frame = canvas?.parentElement
    if (!canvas || !frame) return
    const trigger = (frame.closest('button')) ?? frame
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.45
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40)
    // Fit full kitten (ears → paws) with margin for idle bob / hover hop.
    camera.position.set(0.12, 1.35, 5.6)
    camera.lookAt(0.04, 1.2, 0)

    scene.add(new THREE.HemisphereLight(0xfff6ee, 0x6a6280, 1.55))
    for (const [color, intensity, x, y, z] of [
      [0xfff1df, 2.8, -2.4, 3.8, 4.2],
      [0xdce8ff, 1.6, 2.8, 1.6, 2.4],
      [0xb8c8ff, 2.4, 1.8, 3.2, -2.8],
    ]) {
      const light = new THREE.DirectionalLight(color, intensity)
      light.position.set(x, y, z)
      scene.add(light)
    }

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let model
    let head
    let body
    let tail
    let earLeft
    let earRight
    let eyeLeft
    let eyeRight
    let pawLeft
    let pawRight
    let curledTail
    let tailTip
    let disposed = false
    let visible = true
    let contextLost = false
    let hovered = false
    let animationFrame = 0
    let clock = 0
    let lastTime = 0
    let blinkUntil = 0
    let nextBlink = 2.4
    let hoverAmount = 0
    let reactUntil = 0
    let squeezeUntil = 0
    let leaveTimer = 0        // 防抖计时器
    const pointer = { x: 0, y: 0 }
    const look = { x: 0, y: 0 }
    const base = {
      head: new THREE.Euler(),
      body: new THREE.Vector3(1, 1, 1),
      tail: new THREE.Euler(),
      curledTail: new THREE.Euler(),
      tailTip: new THREE.Euler(),
      earLeft: new THREE.Euler(),
      earRight: new THREE.Euler(),
      eyeLeft: new THREE.Vector3(1, 1, 1),
      eyeRight: new THREE.Vector3(1, 1, 1),
      pawLeft: new THREE.Euler(),
      pawRight: new THREE.Euler(),
    }

    const render = () => renderer.render(scene, camera)
    const stop = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = 0
      lastTime = 0
    }

    const captureBases = () => {
      if (head) base.head.copy(head.rotation)
      if (body) base.body.copy(body.scale)
      if (tail) base.tail.copy(tail.rotation)
      if (curledTail) base.curledTail.copy(curledTail.rotation)
      if (tailTip) base.tailTip.copy(tailTip.rotation)
      if (earLeft) base.earLeft.copy(earLeft.rotation)
      if (earRight) base.earRight.copy(earRight.rotation)
      if (eyeLeft) base.eyeLeft.copy(eyeLeft.scale)
      if (eyeRight) base.eyeRight.copy(eyeRight.scale)
      if (pawLeft) base.pawLeft.copy(pawLeft.rotation)
      if (pawRight) base.pawRight.copy(pawRight.rotation)
    }

    const triggerReact = (kind = 'enter') => {
      if (motion.matches) return
      reactUntil = clock + (kind === 'enter' ? 0.7 : 0.35)
      if (kind === 'enter') {
        // Happy double-blink on notice.
        blinkUntil = clock + 0.28
        nextBlink = clock + 1.6 + Math.random()
      }
    }

    const applyPose = (time, delta) => {
      if (!model) return
      hoverAmount = damp(hoverAmount, hovered ? 1 : 0, hovered ? 10 : 6, delta)
      const h = hoverAmount
      const react = Math.max(0, reactUntil - time)
      const reactPulse = react > 0 ? Math.sin((1 - react / 0.7) * Math.PI) : 0
      const squeeze = Math.max(0, squeezeUntil - time)
      const squeezeAmt = squeeze > 0 ? Math.sin((1 - squeeze / 0.22) * Math.PI) : 0

      const breathe = Math.sin(time * (2.1 + h * 1.4)) * (0.04 + h * 0.035)
      const sway = Math.sin(time * (1.15 + h * 1.8)) * (0.08 + h * 0.16) + reactPulse * 0.12
      const nod = Math.sin(time * (1.7 + h)) * (0.04 + h * 0.07) - reactPulse * 0.08
      const earTwitch = Math.sin(time * (3.2 + h * 3)) * (0.06 + h * 0.14) + reactPulse * 0.18

      // Frontal camera: Z/X read on screen. Keep amplitudes readable but not wild enough to leave the frustum.
      const wagFast = time * (4.2 + h * 3.2)
      const tailSwingZ = Math.sin(wagFast) * (0.35 + h * 0.55) + reactPulse * 0.45
      const tailSwingX = Math.sin(wagFast * 0.85 + 0.4) * (0.18 + h * 0.28)
      const tipFlick = Math.sin(wagFast * 1.5) * (0.25 + h * 0.4)

      // Wave paw up (X) and across the body (Z) so "招手" is obvious.
      const wave = time * (7 + h * 2)
      const pawLift = -0.12 - h * (0.4 + Math.sin(wave) * 0.4) - reactPulse * 0.4
      const pawAcross = h * (0.28 + Math.sin(wave + 0.3) * 0.4) + reactPulse * 0.28
      const pawOtherLift = -0.04 - h * (0.1 + Math.sin(wave + 1.1) * 0.14)

      const lookGain = 0.16 + h * 0.42
      look.x = damp(look.x, pointer.x * lookGain, 9, delta)
      look.y = damp(look.y, pointer.y * (0.1 + h * 0.28), 9, delta)

      if (time >= nextBlink) {
        blinkUntil = time + (h > 0.5 ? 0.1 : 0.12)
        nextBlink = time + (h > 0.5 ? 1.4 : 2.4) + Math.random() * (h > 0.5 ? 1.6 : 2.6)
      }
      const blinkWindow = h > 0.5 ? 0.1 : 0.12
      const blinking = time < blinkUntil
      const blinkAmount = blinking
        ? Math.sin(THREE.MathUtils.clamp(1 - (blinkUntil - time) / blinkWindow, 0, 1) * Math.PI)
        : 0
      const eyeOpen = Math.max(0.08, 1 - blinkAmount * 0.92)
      const eyePop = 1 + h * 0.1 + reactPulse * 0.12

      if (body) {
        const squash = 1 - squeezeAmt * 0.08
        const stretch = 1 + squeezeAmt * 0.06
        body.scale.set(
          base.body.x * (1 + breathe * 0.5) * stretch,
          base.body.y * (1 + breathe) * squash,
          base.body.z * (1 + breathe * 0.5) * stretch,
        )
      }
      if (head) {
        head.rotation.set(
          base.head.x + nod - look.y + reactPulse * -0.1,
          base.head.y + look.x * 1.15,
          base.head.z + sway + look.x * 0.2,
        )
      }
      if (tail) {
        tail.rotation.set(
          base.tail.x + tailSwingX,
          base.tail.y + look.x * 0.2,
          base.tail.z + tailSwingZ,
        )
      }
      if (curledTail) {
        curledTail.rotation.set(
          base.curledTail.x,
          base.curledTail.y,
          base.curledTail.z + tipFlick * 0.45,
        )
      }
      if (tailTip) {
        tailTip.rotation.set(
          base.tailTip.x + tipFlick * 0.25,
          base.tailTip.y,
          base.tailTip.z + tipFlick,
        )
      }
      if (earLeft) {
        earLeft.rotation.set(
          base.earLeft.x - h * 0.06 - reactPulse * 0.1,
          base.earLeft.y,
          base.earLeft.z - earTwitch - look.x * 0.2 - h * 0.08,
        )
      }
      if (earRight) {
        earRight.rotation.set(
          base.earRight.x - h * 0.06 - reactPulse * 0.1,
          base.earRight.y,
          base.earRight.z + earTwitch + look.x * 0.2 + h * 0.08,
        )
      }
      if (eyeLeft) {
        eyeLeft.scale.set(base.eyeLeft.x * eyePop, base.eyeLeft.y * eyeOpen * (1 + h * 0.02), base.eyeLeft.z)
      }
      if (eyeRight) {
        eyeRight.scale.set(base.eyeRight.x * eyePop, base.eyeRight.y * eyeOpen * (1 + h * 0.02), base.eyeRight.z)
      }
      if (pawRight) {
        pawRight.rotation.set(
          base.pawRight.x + pawLift,
          base.pawRight.y + h * 0.15,
          base.pawRight.z + pawAcross,
        )
      }
      if (pawLeft) {
        pawLeft.rotation.set(
          base.pawLeft.x + pawOtherLift,
          base.pawLeft.y - h * 0.08,
          base.pawLeft.z - h * 0.12,
        )
      }

      // Whole-body lean toward the pointer + excited hop while hovered.
      // Keep idle vertical motion small so ears/paws stay inside the frustum.
      model.rotation.y = Math.sin(time * 0.5) * 0.06 * (1 - h * 0.4) + look.x * (0.18 + h * 0.28)
      model.rotation.z = look.x * (0.03 + h * 0.06)
      model.position.y =
        Math.sin(time * 2.1) * 0.012 * (1 - h * 0.35) +
        h * (0.03 + Math.abs(Math.sin(time * 5.2)) * 0.035) +
        reactPulse * 0.05 -
        squeezeAmt * 0.03
      model.position.x = look.x * (0.03 + h * 0.05)
      model.scale.setScalar(1 + h * 0.03 + reactPulse * 0.035 - squeezeAmt * 0.025)
    }

    const tick = (timeMs) => {
      animationFrame = 0
      if (disposed || contextLost || !visible || document.hidden) return
      if (!lastTime) lastTime = timeMs
      const delta = Math.min(0.05, (timeMs - lastTime) / 1000)
      lastTime = timeMs
      clock += delta

      if (!motion.matches && model) {
        applyPose(clock, delta)
        canvas.dataset.animation = hoverAmount > 0.35 ? 'Hover' : 'Idle'
      }
      render()
      animationFrame = requestAnimationFrame(tick)
    }

    const syncPlayback = () => {
      stop()
      if (contextLost || disposed || !model) return
      if (motion.matches) {
        if (body) body.scale.copy(base.body)
        if (head) head.rotation.copy(base.head)
        if (tail) tail.rotation.copy(base.tail)
        if (curledTail) curledTail.rotation.copy(base.curledTail)
        if (tailTip) tailTip.rotation.copy(base.tailTip)
        if (earLeft) earLeft.rotation.copy(base.earLeft)
        if (earRight) earRight.rotation.copy(base.earRight)
        if (eyeLeft) eyeLeft.scale.copy(base.eyeLeft)
        if (eyeRight) eyeRight.scale.copy(base.eyeRight)
        if (pawLeft) pawLeft.rotation.copy(base.pawLeft)
        if (pawRight) pawRight.rotation.copy(base.pawRight)
        model.rotation.set(0, 0, 0)
        model.position.set(0, 0, 0)
        model.scale.setScalar(1)
        canvas.dataset.animation = 'Still'
        render()
        return
      }
      if (visible && !document.hidden) animationFrame = requestAnimationFrame(tick)
    }

    const updatePointer = (clientX, clientY) => {
      const rect = trigger.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      pointer.x = THREE.MathUtils.clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1)
      pointer.y = THREE.MathUtils.clamp(-(((clientY - rect.top) / rect.height) * 2 - 1), -1, 1)
    }

    const enter = (event) => {
      // 清除待执行的 leave 防抖，避免将要关闭的状态就这样过去
      if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = 0 }
      const wasHovered = hovered
      hovered = true
      updatePointer(event.clientX, event.clientY)
      // 只有真正从非-hover 进入时才触发反应，防止在边缘微小移动导致反复跳动
      if (!wasHovered) triggerReact('enter')
      if (!animationFrame) syncPlayback()
    }
    const move = (event) => {
      if (!hovered) return
      const prevX = pointer.x
      const prevY = pointer.y
      updatePointer(event.clientX, event.clientY)
      if (Math.hypot(pointer.x - prevX, pointer.y - prevY) > 0.35 && clock > reactUntil) {
        triggerReact('nudge')
      }
    }
    const leave = () => {
      // 延迟 120ms 再关闭 hover 状态，吸收指针在边缘微动导致的瞬间离开
      if (leaveTimer) clearTimeout(leaveTimer)
      leaveTimer = window.setTimeout(() => {
        leaveTimer = 0
        hovered = false
        pointer.x = 0
        pointer.y = 0
      }, 120)
    }
    const focus = () => {
      if (trigger.matches(':focus-visible')) {
        hovered = true
        triggerReact('enter')
        if (!animationFrame) syncPlayback()
      }
    }
    const down = (event) => {
      if (event.button !== 0) return
      updatePointer(event.clientX, event.clientY)
      squeezeUntil = clock + 0.22
      triggerReact('nudge')
    }

    trigger.addEventListener('pointerenter', enter)
    trigger.addEventListener('pointermove', move)
    trigger.addEventListener('pointerleave', leave)
    trigger.addEventListener('pointerdown', down)
    trigger.addEventListener('focusin', focus)
    trigger.addEventListener('focusout', leave)
    motion.addEventListener('change', syncPlayback)
    document.addEventListener('visibilitychange', syncPlayback)

    const resize = () => {
      const width = Math.max(1, frame.clientWidth)
      const height = Math.max(1, frame.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      if (!contextLost) render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(frame)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      syncPlayback()
    })
    intersection.observe(frame)

    const lost = (event) => {
      event.preventDefault()
      contextLost = true
      stop()
      canvas.style.opacity = '0'
      // Fall back to the portrait PNG instead of a blank white hole.
      frame.classList.remove('has-loaded-model')
    }
    const restored = () => {
      contextLost = false
      // Browser restored the context; force a remount-friendly blank so next paint can recover via PNG until reload.
      canvas.style.opacity = '0'
      frame.classList.remove('has-loaded-model')
    }
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)

    const disposeModel = (root) => {
      const materials = new Set()
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          materials.add(material)
        }
      })
      materials.forEach((material) => material.dispose())
    }

    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (disposed) {
          disposeModel(gltf.scene)
          return
        }
        model = gltf.scene
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = false
            object.receiveShadow = false
            const materials = Array.isArray(object.material) ? object.material : [object.material]
            for (const material of materials) {
              if ('roughness' in material && typeof material.roughness === 'number') {
                material.roughness = Math.min(0.85, Math.max(0.28, material.roughness))
              }
            }
          }
        })
        scene.add(model)
        head = findObject(model, 'Head.002', 'Head')
        body = findObject(model, 'Body')
        tail = findObject(model, 'Tail')
        earLeft = findObject(model, 'EarLeft')
        earRight = findObject(model, 'EarRight')
        eyeLeft = findObject(model, 'EyeLeft')
        eyeRight = findObject(model, 'EyeRight')
        pawLeft = findObject(model, 'PawLeft')
        pawRight = findObject(model, 'PawRight')
        curledTail = findObject(model, 'Curled tail')
        tailTip = findObject(model, 'Round tail tip')
        captureBases()
        resize()
        canvas.style.opacity = '1'
        frame.classList.add('has-loaded-model')
        syncPlayback()
      },
      undefined,
      () => {
        canvas.style.opacity = '0'
      },
    )

    return () => {
      disposed = true
      stop()
      if (leaveTimer) clearTimeout(leaveTimer)
      if (model) disposeModel(model)
      observer.disconnect()
      intersection.disconnect()
      trigger.removeEventListener('pointerenter', enter)
      trigger.removeEventListener('pointermove', move)
      trigger.removeEventListener('pointerleave', leave)
      trigger.removeEventListener('pointerdown', down)
      trigger.removeEventListener('focusin', focus)
      trigger.removeEventListener('focusout', leave)
      motion.removeEventListener('change', syncPlayback)
      document.removeEventListener('visibilitychange', syncPlayback)
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
      frame.classList.remove('has-loaded-model')
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="ai-assistant-avatar__model" aria-hidden />
}
