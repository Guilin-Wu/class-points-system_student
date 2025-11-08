document.addEventListener('DOMContentLoaded', () => {

    // 全局变量
    let CURRENT_CLASS_DATA = null; // 存储 App.state
    let CURRENT_STUDENT = null;

    // DOM 元素
    const loginContainer = document.getElementById('login-container');
    const portalContainer = document.getElementById('portal-container');
    const loginForm = document.getElementById('login-form');
    const loginTitle = document.getElementById('login-title');
    const selectStudent = document.getElementById('select-student');
    const btnLogout = document.getElementById('btn-logout');
    
    // 关键：获取新的文件输入框
    const manualFileLoad = document.getElementById('manual-file-load');
    // 关键：获取登录按钮
    const loginButton = loginForm.querySelector('button[type="submit"]');

    /**
     * 辅助函数：获取成就 (不变)
     */
    const getAchievement = (totalEarnedPoints, achievementTiers) => {
        if (!achievementTiers || achievementTiers.length === 0) return null;
        const sortedTiers = [...(achievementTiers || [])].sort((a, b) => b.points - a.points);
        const achievedTier = sortedTiers.find(tier => totalEarnedPoints >= tier.points);
        if (!achievedTier) return null;
        return { title: achievedTier.name, level: achievedTier.level };
    };

    /**
     * 步骤1：(新) 监听文件选择
     * 这是启动数据加载的入口
     */
    manualFileLoad.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();

        // 文件读取成功时的回调
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // 验证数据 (确保它是教师端导出的 App.state)
                if (!data || !data.students) {
                    throw new Error('JSON 文件格式不正确，缺少 "students" 属性');
                }
                
                // 数据有效！处理并填充下拉框
                processAndPopulate(data);

            } catch (err) {
                console.error('读取或解析 JSON 失败:', err);
                alert('文件加载失败！请确保你选择的是正确的 .json 文件。\n错误: ' + err.message);
                
                // 重置
                loginTitle.textContent = '👨‍🎓 学生积分门户';
                selectStudent.innerHTML = '<option value="">-- 请老师先加载数据 --</option>';
                selectStudent.disabled = true;
                loginButton.disabled = true;
            }
        };

        // 文件读取失败时的回调
        reader.onerror = () => {
            alert('读取文件时发生错误！');
        };

        // 开始读取文件
        reader.readAsText(file);
    });

    /**
     * 步骤2：(新) 处理并填充数据
     * (在文件加载成功后被调用)
     */
    const processAndPopulate = (data) => {
        CURRENT_CLASS_DATA = data; // 存储 App.state

        if (data.students.length > 0) {
            loginTitle.textContent = '数据加载成功！'; // 提示
            selectStudent.innerHTML = '<option value="">-- 请选择你的名字 --</option>';
            data.students
                .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-Hans-CN'))
                .forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.id;
                    option.textContent = student.name;
                    selectStudent.appendChild(option);
                });
            
            // 关键：启用下拉框和登录按钮
            selectStudent.disabled = false;
            loginButton.disabled = false;

        } else {
            loginTitle.textContent = '班级暂无学生';
            selectStudent.innerHTML = '<option value="">-- 班级无学生数据 --</option>';
            selectStudent.disabled = true;
            loginButton.disabled = true;
        }
    };

    /**
     * 步骤3：处理登录 (不变)
     */
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const studentId = selectStudent.value;
        if (!studentId || !CURRENT_CLASS_DATA) {
            alert('数据尚未加载或你未选择名字');
            return;
        }
        
        CURRENT_STUDENT = CURRENT_CLASS_DATA.students.find(s => s.id === studentId);
        
        if (CURRENT_STUDENT) {
            displayStudentPortal();
            loginContainer.style.display = 'none';
            portalContainer.style.display = 'block';
        }
    });

    /**
     * 步骤4：渲染门户数据 (不变)
     */
    const displayStudentPortal = () => {
        if (!CURRENT_STUDENT || !CURRENT_CLASS_DATA) return;
        
        const student = CURRENT_STUDENT;
        const state = CURRENT_CLASS_DATA;

        document.querySelector('#portal-container .student-name').textContent = student.name;
        const infoList = document.getElementById('student-info-list');
        infoList.innerHTML = '';
        
        const sortedStudents = [...state.students].sort((a, b) => (b.points || 0) - (a.points || 0));
        const rank = sortedStudents.findIndex(s => s.id === student.id) + 1;
        const achievement = getAchievement(student.totalEarnedPoints || 0, state.achievementTiers);
        
        infoList.innerHTML = `
            <li><span>当前积分:</span> <strong>${student.points || 0} ⭐</strong></li>
            <li><span>班级排名:</span> <strong>第 ${rank} 名</strong></li>
            <li><span>累计获得:</span> <strong>${student.totalEarnedPoints || 0}</strong></li>
            <li><span>我的称号:</span> <strong>${achievement ? achievement.title : '暂无'}</strong></li>
        `;
        
        const storeList = document.getElementById('store-list');
        storeList.innerHTML = '';
        if (state.rewards && state.rewards.length > 0) {
            state.rewards.sort((a,b) => a.cost - b.cost).forEach(r => {
                storeList.innerHTML += `<li><span>${r.name}</span><span class="cost">${r.cost} 积分</span></li>`;
            });
        } else {
            storeList.innerHTML = '<li>商城暂未上架奖品</li>';
        }
        
        const recordList = document.getElementById('student-record-list');
        recordList.innerHTML = '';
        const myRecords = (state.records || [])
            .filter(r => r.studentId === student.id)
            .slice()
            .reverse();
            
        if (myRecords.length > 0) {
            myRecords.forEach(r => {
                const changeNum = parseInt(r.change);
                const changeClass = changeNum > 0 ? 'positive' : 'negative';
                recordList.innerHTML += `
                    <tr class="${r.undone ? 'record-undone' : ''}">
                        <td>${r.time}</td>
                        <td class="change ${changeClass}">${r.change}</td>
                        <td>${r.reason}</td>
                        <td>${r.finalPoints}</td>
                    </tr>
                `;
            });
        } else {
            recordList.innerHTML = '<tr><td colspan="4" style="text-align: center;">你还没有积分记录</td></tr>';
        }
    };

    /**
     * 步骤5：处理退出 (重置状态)
     */
    btnLogout.addEventListener('click', () => {
        // 重置为初始状态
        CURRENT_STUDENT = null;
        // (保留 CURRENT_CLASS_DATA，这样学生退出后，下一个学生还能登录)
        
        portalContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        
        selectStudent.value = ''; // 重置下拉框
        
        // 重置文件输入框，以便老师可以加载一个新文件
        manualFileLoad.value = ''; 
    });

    // --- 启动 ---
    // 页面加载时不再做任何事，等待教师操作
});