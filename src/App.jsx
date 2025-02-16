import { useState, useEffect } from "react";

const API_URL = "https://api.hidequel.grupo-04.sd.ufersa.dev.br";

const Board = ({ gameId }) => {
  const [board, setBoard] = useState([]);
  const [turn, setTurn] = useState("R");
  const [score, setScore] = useState({ R: 0, B: 0 });
  const [selectedPiece, setSelectedPiece] = useState(null);

  // Atualiza o board e o jogo em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGame();
    }, 1000); // A cada 1 segundo

    return () => clearInterval(interval); // Limpa o intervalo ao sair do componente
  }, [gameId]);

  function isValidMove(fromRow, fromCol, toRow, toCol, piece) {
    if (board[toRow][toCol]) return false; // Verifica se a casa de destino está vazia

    // Verifica se o movimento é na diagonal
    if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;

    // Verifica se é um movimento de uma peça comum (deve ser para uma casa adjacente)
    const moveDistance = Math.abs(fromRow - toRow);
    if (piece === "R" || piece === "B") {
      if (moveDistance > 2) return false;  // Movimento maior que 2 casas não é permitido para peças comuns
    }

    // Verifica se é um movimento de captura (deve saltar sobre a peça adversária)
    if (moveDistance === 2) {
      const midRow = (fromRow + toRow) / 2;
      const midCol = (fromCol + toCol) / 2;
      const opponentPiece = piece === "R" ? "B" : "R";

      if (board[midRow][midCol] && board[midRow][midCol][0] === opponentPiece) {
        return true;
      } else {
        return false;
      }
    }

    return true;
  }

  // Função para promover a peça para dama
  function promoteToKing(piece, row) {
    if (piece === "R" && row === 0) return "R*";  // Dama Vermelha
    if (piece === "B" && row === 7) return "B*";  // Dama Preta
    return piece;
  }

  // Função que verifica o fim do jogo
  function checkGameOver(board) {
    const redPieces = board.flat().filter(cell => cell && cell[0] === "R").length;
    const blackPieces = board.flat().filter(cell => cell && cell[0] === "B").length;
    if (redPieces === 0) {
      alert("Vitória das peças pretas!");
    } else if (blackPieces === 0) {
      alert("Vitória das peças vermelhas!");
    }
  }

  async function fetchGame() {
    const res = await fetch(`${API_URL}/game/${gameId}`);
    const data = await res.json();
    if (data.state) {
      setBoard(data.state);
      setTurn(data.turn);
      checkGameOver(data.state); // Verifica o fim do jogo
    }
  }

  async function movePiece(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!isValidMove(fromRow, fromCol, toRow, toCol, piece[0])) {
      alert("Movimento inválido");
      return;
    }

    const res = await fetch(`${API_URL}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, from: [fromRow, fromCol], to: [toRow, toCol] })
    });

    const data = await res.json();
    if (data.gameState) {
      // Atualiza o tabuleiro e o turno
      setBoard(data.gameState);
      setTurn(turn === "R" ? "B" : "R");
      updateScore(data.capturedPiece);
    }
  }

  function updateScore(capturedPiece) {
    if (capturedPiece) {
      setScore(prevScore => ({
        ...prevScore,
        [capturedPiece[0]]: prevScore[capturedPiece[0]] + 1
      }));
    }
  }

  function handleClick(row, col) {
    if (selectedPiece) {
      movePiece(selectedPiece.row, selectedPiece.col, row, col);
      setSelectedPiece(null);
    } else if (board[row][col] && board[row][col][0] === turn) {
      setSelectedPiece({ row, col });
    }
  }

  // Função para copiar o gameId
  const copyGameId = () => {
    navigator.clipboard.writeText(gameId);
    alert("Game ID copiado para a área de transferência!");
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div className="text-white">Red: {score.R}</div>
        <div className="text-white">Black: {score.B}</div>
      </div>

      {/* Exibindo o Game ID copiável */}
      <div className="bg-blue-500 text-white p-2 mb-4 flex justify-between items-center">
        <span>{gameId}</span>
        <button
          onClick={copyGameId}
          className="bg-yellow-500 text-black p-1 rounded"
        >
          Copiar ID
        </button>
      </div>

      <div className="grid grid-cols-8 w-96 border-4 border-black">
        {board.flatMap((row, rIdx) =>
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`w-12 h-12 flex items-center justify-center ${
                (rIdx + cIdx) % 2 === 0 ? "bg-gray-200" : "bg-gray-800"
              } ${selectedPiece?.row === rIdx && selectedPiece?.col === cIdx ? "border-2 border-yellow-500" : ""}`}
              onClick={() => handleClick(rIdx, cIdx)}
            >
              {cell && (
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    cell[0] === "R" ? "bg-red-500" : "bg-black"
                  }`}
                >
                  {cell}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [gameId, setGameId] = useState(null);
  const [inputGameId, setInputGameId] = useState(""); // Adicionar um estado para o ID do jogo

  // Iniciar ou conectar a um jogo existente
  const startNewGame = async () => {
    if (inputGameId) {
      // Entrar em um jogo existente
      setGameId(inputGameId);
    } else {
      // Criar um novo jogo
      const res = await fetch(`${API_URL}/game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: crypto.randomUUID() })
      });

      const data = await res.json();
      if (data.gameId) {
        setGameId(data.gameId); // Correção aqui
      } else {
        console.error("Erro: Resposta da API não contém gameId", data);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-600">
      <h1 className="text-white text-3xl mb-4">Damas Multiplayer</h1>
      
      {/* Campo para inserir o ID do jogo */}
      <div>
        <input
          type="text"
          value={inputGameId}
          onChange={(e) => setInputGameId(e.target.value)}
          className="p-2 mb-4"
          placeholder="Insira o ID do jogo"
        />
        <button onClick={startNewGame} className="bg-yellow-500 text-white p-2">
          {inputGameId ? "Entrar no Jogo" : "Criar Novo Jogo"}
        </button>
      </div>

      {gameId ? <Board gameId={gameId} /> : <p>Carregando jogo...</p>}
    </div>
  );
};

export default App;
