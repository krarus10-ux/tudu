<<<<<<< HEAD
import { useEffect, useRef, useState } from 'react';
import './App.css';

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 400;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const formatDay = (ts) =>
  new Date(ts).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function App() {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(null);

  const [tu, setTu] = useState(
    localStorage.getItem("tu")
      ? JSON.parse(localStorage.getItem("tu"))
      : []
  );

  const [trash, setTrash] = useState(
    localStorage.getItem("tuTrash")
      ? JSON.parse(localStorage.getItem("tuTrash"))
      : []
  );

  const [editId, setEditId] = useState(null);
  const [sort, setSort] = useState("all");

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem("tu", JSON.stringify(tu));
    } catch {
      alert("Память браузера заполнена. Удали часть фото или задач.");
    }
  }, [tu]);

  useEffect(() => {
    try {
      localStorage.setItem("tuTrash", JSON.stringify(trash));
    } catch {
      alert("Память браузера заполнена. Очисти корзину.");
    }
  }, [trash]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setViewPhoto(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const startVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Голосовой ввод не поддерживается в этом браузере");
      return;
    }

    const rec = new SR();
    rec.lang = "ru-RU";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      setText((prev) => (prev ? prev + " " + transcript : transcript));
    };

    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const data = await compressImage(file);
      setPhoto(data);
    } catch {
      alert("Не удалось загрузить фото");
    }
  };

  const htu = (a) => {
    a.preventDefault();

    if (!text.trim() && !photo) return;

    if (editId !== null) {
      setTu(tu.map((itm) =>
        itm.id === editId
          ? { ...itm, taitel: text.trim(), img: photo ?? itm.img }
          : itm
      ));

      setEditId(null);
    } else {
      let g = {
        id: Date.now(),
        taitel: text.trim(),
        ofno: false,
        img: photo
      };

      setTu([...tu, g]);
    }

    setText("");
    setPhoto(null);
  };

  const editTask = (id) => {
    const task = tu.find((itm) => itm.id === id);
    setText(task.taitel);
    setEditId(id);
  };

  const deleteTask = (id) => {
    const task = tu.find((itm) => itm.id === id);
    if (task) {
      setTrash([{ ...task, deletedAt: Date.now() }, ...trash]);
    }

    setTu(tu.filter((itm) => itm.id !== id));

    if (editId === id) {
      setEditId(null);
      setText("");
    }
  };

  const restoreTask = (id) => {
    const task = trash.find((itm) => itm.id === id);
    if (!task) return;

    const { deletedAt, ...rest } = task;
    setTu([...tu, rest]);
    setTrash(trash.filter((itm) => itm.id !== id));
  };

  const purgeTask = (id) => {
    setTrash(trash.filter((itm) => itm.id !== id));
  };

  const emptyTrash = () => {
    if (window.confirm("Очистить корзину? Это действие необратимо.")) {
      setTrash([]);
    }
  };

  const toggleTask = (id) => {
    setTu(tu.map((itm) =>
      itm.id === id
        ? { ...itm, ofno: !itm.ofno }
        : itm
    ));
  };

  const filteredTu = tu.filter((itm) => {
    if (sort === "done") return itm.ofno === true;
    if (sort === "active") return itm.ofno === false;
    return true;
  });

  // Группировка по дате создания, новые дни сверху
  const groups = [];
  const groupMap = {};
  [...filteredTu].reverse().forEach((itm) => {
    const key = formatDay(itm.id);
    if (!groupMap[key]) {
      groupMap[key] = { day: key, items: [] };
      groups.push(groupMap[key]);
    }
    groupMap[key].items.push(itm);
  });
  groups.forEach((g) => g.items.reverse());

  const isTrashView = sort === "deleted";

  const renderTask = (itm) => (
    <div key={itm.id} className="tyd">
      <div className="l">

        <input
          type="checkbox"
          checked={itm.ofno}
          onChange={() => toggleTask(itm.id)}
        />

        {itm.img && (
          <img
            className="thumb"
            src={itm.img}
            alt=""
            onClick={() => setViewPhoto(itm.img)}
          />
        )}

        <h4 className={itm.ofno ? "zamH4 done" : "zamH4"}>
          {itm.taitel || "Фото"}
        </h4>

        <div className="actions">
          <button
            className="edit"
            type="button"
            onClick={() => editTask(itm.id)}
          >
            ✎
          </button>

          <button
            className="delete"
            type="button"
            onClick={() => deleteTask(itm.id)}
          >
            ✕
          </button>
        </div>

      </div>
    </div>
  );

  return (
    <div className="list">

      <div className="conteyner">
        <form className="text" onSubmit={htu}>
          <input
            type="text"
            className="textPole"
            placeholder="Добавить задачу..."
            value={text}
            onChange={(a) => setText(a.target.value)}
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhoto}
          />

          <button
            className="attach"
            type="button"
            title="Прикрепить фото"
            onClick={() => fileRef.current?.click()}
          >
            📷
          </button>

          <button
            className={listening ? "mic micOn" : "mic"}
            type="button"
            onClick={startVoice}
            title="Голосовой ввод"
          >
            🎤
          </button>

          <button className="btn" type="submit">
            {editId !== null ? "✓" : "+"}
          </button>
        </form>
      </div>

      {photo && (
        <div className="photoPreview">
          <img src={photo} alt="" />
          <button
            className="delete"
            type="button"
            title="Убрать фото"
            onClick={() => setPhoto(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="sort">
        <button
          className={sort === "all" ? "activeSort" : ""}
          onClick={() => setSort("all")}
        >
          Все ({tu.length})
        </button>

        <button
          className={sort === "active" ? "activeSort" : ""}
          onClick={() => setSort("active")}
        >
          Не завершено ({tu.filter((itm) => !itm.ofno).length})
        </button>

        <button
          className={sort === "done" ? "activeSort" : ""}
          onClick={() => setSort("done")}
        >
          Завершено ({tu.filter((itm) => itm.ofno).length})
        </button>

        <button
          className={sort === "deleted" ? "activeSort" : ""}
          onClick={() => setSort("deleted")}
        >
          Удалённые ({trash.length})
        </button>
      </div>

      {isTrashView && trash.length > 0 && (
        <div className="trashBar">
          <button className="clearTrash" type="button" onClick={emptyTrash}>
            Очистить корзину
          </button>
        </div>
      )}

      <div className="zametki">
        {isTrashView ? (
          trash.length > 0 ? (
            trash.map((itm) => (
              <div key={itm.id} className="tyd">
                <div className="l">

                  {itm.img && (
                    <img
                      className="thumb"
                      src={itm.img}
                      alt=""
                      onClick={() => setViewPhoto(itm.img)}
                    />
                  )}

                  <h4 className="zamH4 done">{itm.taitel || "Фото"}</h4>

                  <div className="actions">
                    <button
                      className="restore"
                      type="button"
                      title="Восстановить"
                      onClick={() => restoreTask(itm.id)}
                    >
                      ↺
                    </button>

                    <button
                      className="delete"
                      type="button"
                      title="Удалить навсегда"
                      onClick={() => purgeTask(itm.id)}
                    >
                      ✕
                    </button>
                  </div>

                </div>
              </div>
            ))
          ) : (
            <h2 className="empty">Корзина пуста</h2>
          )
        ) : groups.length > 0 ? (
          groups.map((g) => (
            <div key={g.day} className="dayGroup">
              <h3 className="dayTitle">{g.day}</h3>
              {g.items.map(renderTask)}
            </div>
          ))
        ) : (
          <h2 className="empty">
            {sort === "done"
              ? "Нет завершённых задач"
              : sort === "active"
              ? "Все задачи завершены"
              : "Пока нет задач"}
          </h2>
        )}
      </div>

      {viewPhoto && (
        <div className="lightbox" onClick={() => setViewPhoto(null)}>
          <img src={viewPhoto} alt="" onClick={(e) => e.stopPropagation()} />
          <button
            className="lightboxClose"
            type="button"
            onClick={() => setViewPhoto(null)}
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
=======
import { useState } from 'react'
import './App.css'


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
   
      
        <button className='btn' onClick={() => setCount((count) => count + 1)}>
          1 ++ 
        </button><p>
          
          {count}</p>
       </>)
}

export default App
>>>>>>> c18e66e5a46ed205e07140c8af745f79284e678d
